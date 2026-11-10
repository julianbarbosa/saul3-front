export interface MenuChildItem {
  id: string;
  label: string;
  path: string;
  loadComponent?: string;
}

export interface MenuModuleItem {
  id: string;
  label: string;
  path: string;
  /** Ruta base propia del módulo (ej. `/visita`). Si no viene, se usa la del menú. */
  basePath?: string;
  loadChildren?: string;
  children: MenuChildItem[];
}

export interface MenuConfig {
  id: string;
  label: string;
  basePath: string;
  modules: MenuModuleItem[];
}

export interface MenuData {
  menu: MenuConfig;
}
