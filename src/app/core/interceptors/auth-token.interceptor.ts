import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, Observable, of, switchMap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AUTH_TOKEN_TYPE_COOKIE_KEY } from '../constants/auth-cookie-keys';
import { AuthService } from '../services/auth.service';
import { getAuthCookie } from '../utils/auth-cookie.util';

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const esApiSaul3 = req.url.startsWith(environment.SAUL3_API_URL);
  const esLogin = req.url.includes('/auth/login');
  const esRefresh = req.url.includes('/auth/refresh');
  const esLogout = req.url.includes('/auth/logout');

  if (!esApiSaul3 || esLogin || req.headers.has('Authorization')) {
    return next(req);
  }

  const auth = inject(AuthService);

  const cerrarSesion = (error: unknown): Observable<never> => {
    auth.limpiarSesionLocal();
    auth.irAlInicio();
    return throwError(() => error);
  };

  const enviarConToken = (token: string) =>
    next(
      req.clone({
        setHeaders: {
          Authorization: `${getAuthCookie(AUTH_TOKEN_TYPE_COOKIE_KEY) ?? 'Bearer'} ${token}`,
        },
      }),
    );

  // /auth/refresh: Bearer con refresh; no enviar si ya venció
  if (esRefresh) {
    if (auth.refreshTokenVencido()) {
      return cerrarSesion(new Error('Refresh token vencido.'));
    }
    const refresh = auth.obtenerRefreshToken();
    if (!refresh) {
      return cerrarSesion(new Error('Sin refresh token.'));
    }
    return next(
      req.clone({
        setHeaders: { Authorization: `Bearer ${refresh}` },
      }),
    );
  }

  /** Access vigente en cookie o renovación preventiva antes de la petición. */
  const tokenParaEnviar$ = (): Observable<string | null> => {
    const actual = auth.obtenerToken();
    if (actual && !auth.tokenDeAccesoVencido()) {
      return of(actual);
    }
    return auth.obtenerTokenValido();
  };

  return tokenParaEnviar$().pipe(
    catchError(cerrarSesion),
    switchMap((token) => {
      if (!token) {
        if (auth.tokenDeAccesoVencido() || auth.refreshTokenVencido()) {
          return cerrarSesion(
            new HttpErrorResponse({ status: 401, statusText: 'Sesión vencida' }),
          );
        }
        return next(req);
      }

      // Logout puede usar access aunque esté por vencer
      if (esLogout) {
        return enviarConToken(token);
      }

      return enviarConToken(token).pipe(
        catchError((error: unknown) => {
          if (
            !(error instanceof HttpErrorResponse) ||
            error.status !== 401 ||
            auth.refreshTokenVencido() ||
            !auth.obtenerRefreshToken()
          ) {
            return throwError(() => error);
          }
          return auth.refrescarToken().pipe(
            switchMap((nuevoToken) => enviarConToken(nuevoToken)),
            catchError(cerrarSesion),
          );
        }),
      );
    }),
  );
};
