import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { Forbidden } from './features/auth/forbidden/forbidden';
import { Login } from './features/auth/login/login';
import { Layout } from './features/main/layout/layout';
import { Main } from './features/main/main/main';
import { CrearPedagogia } from './features/pedagogia/crear-pedagogia/crear-pedagogia';
import { ListaProgramacionPedagogia } from './features/pedagogia/lista-programacion-pedagogia/lista-programacion-pedagogia';
import { ProgramarPedagogia } from './features/pedagogia/programar-pedagogia/programar-pedagogia';

export const routes: Routes = [
  {
    path: '',
    component: Login,
    title: 'Iniciar sesión - Sistema Gestión de Procesos Administrativos',
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
        path: 'pedagogia/listar',
        component: ListaProgramacionPedagogia,
        title: 'Listar Pedagogía',
      },
      {
        path: 'pedagogia/crear',
        component: CrearPedagogia,
        title: 'Crear Pedagogía',
      },
      {
        path: 'pedagogia/programar',
        component: ProgramarPedagogia,
        title: 'Programar Pedagogía',
      },
      
      {
        path: '',
        redirectTo: 'comparendo/sincronizar',
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
    path: 'control-sanciones',
    component: Layout,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./features/control-sanciones/control-sanciones-module').then(
            (m) => m.ControlSancionesModule,
          ),
      },
    ],
  },
  {
    path: 'firma-digital',
    component: Layout,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./features/firma-digital/firma-digital-module').then(
            (m) => m.FirmaDigitalModule,
          ),
      },
    ],
  },
  {
    path: '403',
    component: Forbidden,
    title: 'Acceso no permitido',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
