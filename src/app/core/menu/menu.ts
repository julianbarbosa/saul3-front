import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  MenuChildItem,
  MenuConfig,
  MenuData,
  MenuModuleItem,
} from '../interfaces/menu.interface';
import menuData from './menu.json';

@Component({
  selector: 'app-menu',
  imports: [],
  templateUrl: './menu.html',
  styleUrl: './menu.css',
})
export class Menu {
  private readonly router = inject(Router);

  readonly menuConfig: MenuConfig = (menuData as MenuData).menu;
  readonly modules: MenuModuleItem[] = this.menuConfig.modules;

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
