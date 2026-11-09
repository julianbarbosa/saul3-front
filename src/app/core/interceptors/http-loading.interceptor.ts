import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';

import { HttpLoadingService } from '../services/http-loading.service';

/** Cabecera opcional para omitir el overlay en una petición concreta. */
export const HTTP_SKIP_LOADING = 'X-Skip-Loading';

export const httpLoadingInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.headers.has(HTTP_SKIP_LOADING)) {
    const cleaned = req.clone({
      headers: req.headers.delete(HTTP_SKIP_LOADING),
    });
    return next(cleaned);
  }

  const loading = inject(HttpLoadingService);
  loading.begin();

  return next(req).pipe(
    finalize(() => {
      loading.end();
    }),
  );
};
