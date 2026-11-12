import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { Login } from './features/auth/login/login';
import { Layout } from './features/main/layout/layout';
import { Main } from './features/main/main/main';

export const routes: Routes = [
  {
    path: '',
    component: Login,
    title: 'Iniciar sesión - Gestión Acceso Justicia',
  },
  {
    path: 'main',
    component: Layout,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        component: Main,
        title: 'Inicio SAUL3',
      },
    ],
  },
  {
    path: 'gestion-acceso-justicia',
    component: Layout,
    canActivate: [authGuard],
    children: [
      {
        path: 'comparendo',
        loadChildren: () =>
          import('./features/comparendo/comparendo-module').then((m) => m.ComparendoModule),
      },
      {
        path: '',
        redirectTo: 'comparendo/descargar',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: 'codigopolicia',
    loadChildren: () =>
      import('./features/comparendo/gestion-ciudadano/codigo-policia.module').then(
        (m) => m.CodigoPoliciaModule,
      ),
    title: 'Código de Policía - Consulta de comparendos',
  },
  {
    path: 'visita',
    component: Layout,
    // canActivate: [authGuard],
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./features/visita/visita-module').then((m) => m.VisitaModule),
      }
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
