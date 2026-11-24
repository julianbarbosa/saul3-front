import { inject } from '@angular/core';

import { PermisosService } from '../services/permisos.service';

/**
 * @deprecated Use `PermisosService.tiene()`, `*hasPermission` o `permissionGuard`.
 * Solo UX; delega en el servicio en memoria.
 */
export function hasPermission(codigo: string): boolean {
  return inject(PermisosService).tiene(codigo);
}

/**
 * @deprecated Use `PermisosService.permisos()`.
 */
export function obtenerPermisosAlmacenados(): string[] {
  return inject(PermisosService).permisos();
}