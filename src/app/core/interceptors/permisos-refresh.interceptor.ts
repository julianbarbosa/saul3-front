import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PERMISOS_API_PATH } from '../constants/permisos.constants';
import { PermisosService } from '../services/permisos.service';

const EXCLUIR_403_REFRESH = ['/auth/login', '/auth/refresh', '/auth/logout', PERMISOS_API_PATH] as const;

function debeRefrescarPermisos(url: string): boolean {
  if (!url.startsWith(environment.SAUL3_API_URL)) {
    return false;
  }
  return !EXCLUIR_403_REFRESH.some((fragment) => url.includes(fragment));
}

/** Ante 403, recarga permisos una vez para refrescar la UI (no reintenta la petición). */
export const permisosRefreshInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 403 &&
        debeRefrescarPermisos(req.url)
      ) {
        inject(PermisosService).refrescarPor403().subscribe();
      }
      return throwError(() => error);
    }),
  );
};