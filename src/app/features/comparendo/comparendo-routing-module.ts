import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Sincronizar } from './sincronizar/sincronizar';
import { ListaProgramacionPedagogia } from '../pedagogia/lista-programacion-pedagogia/lista-programacion-pedagogia';
import { RegistrarAsistenciaPedagogia } from '../pedagogia/registrar-asistencia-pedagogia/registrar-asistencia-pedagogia';

const routes: Routes = [
  {
    path: 'gestion-ciudadano',
    loadChildren: () =>
      import('./gestion-ciudadano/codigo-policia.module').then((m) => m.CodigoPoliciaModule),
  },
  {
    path: 'sincronizar',
    component: Sincronizar,
  },
  {
    path: 'pedagogia/:id/asistencia',
    component: RegistrarAsistenciaPedagogia,
  },
  {
    path: 'pedagogia',
    component: ListaProgramacionPedagogia,
  },
  {
    path: '',
    redirectTo: 'sincronizar',
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ComparendoRoutingModule {}