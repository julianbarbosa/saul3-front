import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlSancionesRoutingModule } from './control-sanciones-routing-module';
import { RegistrarMovimientoExpedienteComponent } from './registrar-movimiento-expediente/registrar-movimiento-expediente.component';
import { RegistrarMovimientoExpedienteMultipleComponent } from './registrar-movimiento-expediente-multiple/registrar-movimiento-expediente-multiple.component';

@NgModule({
  imports: [
    CommonModule,
    ControlSancionesRoutingModule,
    RegistrarMovimientoExpedienteComponent,
    RegistrarMovimientoExpedienteMultipleComponent,
  ],
})
export class ControlSancionesModule {}