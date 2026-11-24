import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Listar } from './listar/listar';

const routes: Routes = [
  {
    path: 'listar',
    component: Listar,
    title: 'Expedientes en proceso de firma',
  },
  {
    path: '',
    redirectTo: 'listar',
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FirmaDigitalRoutingModule {}
