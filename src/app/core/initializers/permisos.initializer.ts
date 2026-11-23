import { inject } from '@angular/core';
import { catchError, firstValueFrom, of } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { PermisosService } from '../services/permisos.service';

export function initPermisosAlArranque(): Promise<void> {
  const auth = inject(AuthService);
  const permisos = inject(PermisosService);

  if (!auth.isAuthenticated()) {
    return Promise.resolve();
  }

  return firstValueFrom(permisos.cargar().pipe(catchError(() => of(undefined))));
}