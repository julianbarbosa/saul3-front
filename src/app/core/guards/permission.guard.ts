import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { PermisosService } from '../services/permisos.service';

export type PermissionMatchMode = 'any' | 'all';

/**
 * Solo UX: redirige a /403 si faltan permisos en la ruta.
 * El backend sigue siendo quien autoriza cada acción.
 */
export const permissionGuard: CanActivateFn = (route) => {
  const permisos = inject(PermisosService);
  const router = inject(Router);

  const uno = route.data['permission'] as string | undefined;
  const varios = route.data['permissions'] as string[] | undefined;
  const modo = (route.data['permissionMatch'] as PermissionMatchMode | undefined) ?? 'any';

  let permitido = true;

  if (uno) {
    permitido = permisos.tiene(uno);
  } else if (varios?.length) {
    permitido = modo === 'all' ? permisos.tieneTodos(varios) : permisos.tieneAlguno(varios);
  }

  return permitido ? true : router.createUrlTree(['/403']);
};