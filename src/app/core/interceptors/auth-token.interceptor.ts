import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AUTH_TOKEN_TYPE_COOKIE_KEY,
  MARGEN_RENOVACION_ACCESS_SEG,
} from '../constants/auth-cookie-keys';
import { AuthService } from '../services/auth.service';
import { getAuthCookie } from '../utils/auth-cookie.util';

const conToken = (req: HttpRequest<unknown>, token: string): HttpRequest<unknown> =>
  req.clone({
    setHeaders: {
      Authorization: `${getAuthCookie(AUTH_TOKEN_TYPE_COOKIE_KEY) ?? 'Bearer'} ${token}`,
    },
  });

/**
 * Adjunta el access token a las peticiones Saul3.
 *
 * Flujo:
 *  1. ¿Token expirado? No  -> request con token.
 *  2. ¿Token expirado? Sí  -> refresh (token + refresh-token nuevos) -> request con el nuevo token.
 *  3. Si el refresh falla (o llega un 401 incluso tras refrescar) -> se cierra la sesión local.
 */
export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const esApiSaul3 = req.url.startsWith(environment.SAUL3_API_URL);
  const esLogin = req.url.includes('/auth/login');
  const esRefresh = req.url.includes('/auth/refresh');
  // const esLogout = req.url.includes('/auth/logout');

  if (!esApiSaul3 || esLogin || esRefresh || req.headers.has('Authorization')) {
    return next(req);
  }

  const auth = inject(AuthService);
  const token = auth.obtenerToken();

  const cerrarSesion = (error: unknown) =>
    auth.cerrarSesion$().pipe(switchMap(() => throwError(() => error)));

  /** Refresca (una sola llamada compartida) y reintenta la petición con el token nuevo. */
  const refrescarYReintentar = () => {
    if (auth.refreshTokenExpirado()) {
      console.log("se venció el refresh token, cerrando sesión");
      auth.cerrarSesion();
      return cerrarSesion(
        new HttpErrorResponse({ status: 401, statusText: 'Sesión expirada' }),
      );
    }
    console.log("refrescando token");
    return auth.refrescarToken().pipe(
      catchError((error: unknown) => cerrarSesion(error)),
      switchMap((nuevoToken) => next(conToken(req, nuevoToken))),
    );
  };

  if (!token) {
    return next(req);
  }

  // Token expirado -> refresh antes de enviar la petición.
  if (auth.tokenExpirado(MARGEN_RENOVACION_ACCESS_SEG)) {
    return refrescarYReintentar();
  }

  // Token vigente -> request con token. Si aun así el servidor responde 401, se intenta refrescar.
  return next(conToken(req, token)).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        return refrescarYReintentar();
      }
      return throwError(() => error);
    }),
  );
};