import {
  Directive,
  effect,
  inject,
  input,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';

import { PermisosService } from '../services/permisos.service';

/**
 * Muestra el contenido solo si el usuario tiene el permiso (UX).
 * Uso: `<ng-container *hasPermission="'mi_permiso'">...</ng-container>`
 * Varios (cualquiera): `*hasPermission="['perm_a', 'perm_b']"`
 */
@Directive({
  selector: '[hasPermission]',
  standalone: true,
})
export class HasPermissionDirective {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly vcr = inject(ViewContainerRef);
  private readonly permisos = inject(PermisosService);

  readonly hasPermission = input.required<string | readonly string[]>();

  private visible = false;

  constructor() {
    effect(() => {
      this.permisos.permisos();
      const codigo = this.hasPermission();
      const ok =
        typeof codigo === 'string'
          ? this.permisos.tiene(codigo)
          : this.permisos.tieneAlguno(codigo);
      if (ok && !this.visible) {
        this.vcr.createEmbeddedView(this.templateRef);
        this.visible = true;
      } else if (!ok && this.visible) {
        this.vcr.clear();
        this.visible = false;
      }
    });
  }
}