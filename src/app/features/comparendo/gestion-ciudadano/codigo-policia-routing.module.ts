import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ListaComparendosComponent } from './lista-comparendos/lista-comparendos.component';
import { DetalleComparendoComponent } from './detalle-comparendo/detalle-comparendo.component';
import { MainComponent } from './main/main.component';
import { CreaObjecionComponent } from './crea-objecion/crea-objecion.component';
import { ListaPedagogiaComponent } from './lista-pedagogia/lista-pedagogia.component';

const routes: Routes = [
  {
    path: '',
    children: [
      // { path: '', redirectTo: 'main', pathMatch: 'full' },
      { path: '', component: MainComponent },
      { path: 'lista-comparendos', component: ListaComparendosComponent },
      { path: 'detalle-comparendo', component: DetalleComparendoComponent },
      { path: 'lista-pedagogia', component: ListaPedagogiaComponent },
      { path: 'crea-objecion', component: CreaObjecionComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CodigoPoliciaRoutingModule {}
