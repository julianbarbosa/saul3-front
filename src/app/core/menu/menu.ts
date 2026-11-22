import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  MenuChildItem,
  MenuConfig,
  MenuData,
  MenuModuleItem,
} from '../interfaces/menu.interface';
import { PermisosService } from '../services/permisos.service';
import menuData from './menu.json';

@Component({
  selector: 'app-menu',
  imports: [],
  templateUrl: './menu.html',
  styleUrl: './menu.css',
})
export class Menu {
  private readonly router = inject(Router);
  private readonly permisos = inject(PermisosService);

  readonly menuConfig: MenuConfig = (menuData as MenuData).menu;

  readonly modules = computed(() =>
    this.menuConfig.modules
      .filter((module) => this.mostrarPorPermiso(module.permissions))
      .map((module) => ({
        ...module,
        children: module.children.filter((child) => this.mostrarPorPermiso(child.permissions)),
      }))
      .filter((module) => module.children.length > 0),
  );

  private mostrarPorPermiso(codigos: string[] | undefined): boolean {
    if (!codigos?.length) {
      return true;
    }
    return this.permisos.tieneAlguno(codigos);
  }

  isNavigable(path: string): boolean {
    return !path.includes(':');
  }

  navigateTo(module: MenuModuleItem, child: MenuChildItem): void {
    if (!this.isNavigable(child.path)) {
      return;
    }

    const url = [module.basePath ?? this.menuConfig.basePath, module.path, child.path]
      .join('/')
      .replace(/\/+/g, '/');

    sessionStorage.setItem('menuItemLabel', child.label);
    this.router.navigateByUrl(url);
  }
}
