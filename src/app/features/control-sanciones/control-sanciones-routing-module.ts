import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RegistrarMovimientoExpedienteComponent } from './registrar-movimiento-expediente/registrar-movimiento-expediente.component';
import { RegistrarMovimientoExpedienteMultipleComponent } from './registrar-movimiento-expediente-multiple/registrar-movimiento-expediente-multiple.component';

const routes: Routes = [
  {
    path: 'registrar-movimiento',
    component: RegistrarMovimientoExpedienteComponent,
    title: 'Registrar movimiento expediente',
  },
  {
    path: 'registrar-movimiento/:id',
    component: RegistrarMovimientoExpedienteComponent,
    title: 'Registrar movimiento expediente',
  },
  {
    path: 'registrar-movimiento-multiple',
    component: RegistrarMovimientoExpedienteMultipleComponent,
    title: 'Movimiento múltiple expediente',
  },
  { path: 'registrarmovimiento', pathMatch: 'full', redirectTo: 'registrar-movimiento' },
  { path: 'registrarmovimiento/:id', redirectTo: 'registrar-movimiento/:id' },
  { path: 'registrarmovimientomultiple', pathMatch: 'full', redirectTo: 'registrar-movimiento-multiple' },
  { path: '', pathMatch: 'full', redirectTo: 'registrar-movimiento-multiple' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ControlSancionesRoutingModule {}