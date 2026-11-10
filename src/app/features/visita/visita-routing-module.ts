import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Gestion } from './gestion/gestion';
import { Emitidos } from './pages/emitidos/emitidos';
import { ListarVisita } from './pages/listar-visita/listar-visita';
import { ListarVisitaTodo } from './pages/listar-visita-todo/listar-visita-todo';

const routes: Routes = [
  {
    path: 'gestionar/:idVisita',
    component: Gestion,
  },
  {
    // SAUL: #!/visita/listar_visita
    path: 'listar-visita',
    component: ListarVisita,
    title: 'Visitas Pendientes',
  },
  {
    // SAUL: #!/visita/listar_visita_todo
    path: 'listar-visita-todo',
    component: ListarVisitaTodo,
    title: 'Todas las Visitas',
  },
  {
    // SAUL: #!/visita/listar_visita_todo?emitir
    path: 'emitidos',
    component: Emitidos,
    title: 'Visitas Emitidas',
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class VisitaRoutingModule {}
