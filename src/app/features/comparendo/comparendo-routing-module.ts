import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Sincronizar } from './sincronizar/sincronizar';

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