import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Gestion } from './gestion/gestion';
import { Tarea } from './tarea/tarea';

const routes: Routes = [
  {
    path: 'gestionar',
    component: Gestion,
  },
  {
    // SAUL: #!/visita/listar_visita
    path: 'listar-visita',
    component: Tarea,
    title: 'Visitas Pendientes',
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class VisitaRoutingModule {}
