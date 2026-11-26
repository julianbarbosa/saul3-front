import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { RECAPTCHA_TOKEN_HEADER } from '../constants/recaptcha.constants';
import { AuthService } from '../services/auth.service';
import { RecaptchaTokenService } from '../services/recaptcha-token.service';
import { RecaptchaV3Service } from '../services/recaptcha-v3.service';

const esPeticionSaul3Publica = (url: string): boolean => {
  if (!url.startsWith(environment.SAUL3_API_URL)) {
    return false;
  }
  if (url.includes('/auth/login') || url.includes('/auth/refresh')) {
    return false;
  }
  return true;
};

/**
 * Sin sesión SAUL3: adjunta X-Recaptcha-Token a las peticiones a la API
 * (flujo ciudadano /codigopolicia y demás accesos públicos).
 * Con sesión vigente el auth-token.interceptor envía Bearer y no se exige reCAPTCHA.
 */
export const publicRecaptchaInterceptor: HttpInterceptorFn = (req, next) => {
  if (!esPeticionSaul3Publica(req.url) || req.headers.has(RECAPTCHA_TOKEN_HEADER)) {
    return next(req);
  }

  const auth = inject(AuthService);
  if (auth.isAuthenticated()) {
    return next(req);
  }

  const tokens = inject(RecaptchaTokenService);
  const v3 = inject(RecaptchaV3Service);

  const enviarConToken = (token: string) => {
    tokens.setToken(token);
    return next(
      req.clone({
        setHeaders: { [RECAPTCHA_TOKEN_HEADER]: token },
      }),
    );
  };

  if (environment.RECAPTCHA_ENABLED) {
    return from(v3.execute(environment.RECAPTCHA_ACTION)).pipe(
      switchMap((token) => enviarConToken(token)),
      catchError((err) => {
        console.error('No se pudo obtener token reCAPTCHA:', err);
        const guardado = tokens.getToken();
        if (guardado) {
          return enviarConToken(guardado);
        }
        return next(req);
      }),
    );
  }

  const guardado = tokens.getToken();
  if (guardado) {
    return enviarConToken(guardado);
  }

  return next(req);
};