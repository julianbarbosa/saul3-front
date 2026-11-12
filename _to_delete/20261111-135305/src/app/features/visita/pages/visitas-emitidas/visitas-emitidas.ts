import { Component, computed, inject, OnInit, signal, TemplateRef, viewChild } from '@angular/core';

import { VisitaListadoFila } from '../../../../core/interfaces/visita.interface';
import { VisitaService } from '../../../../core/services/visita.service';
import { ColumnaTabla, OpcionFiltro, Table } from '../../../../shared/components/table/table';
import { AccionesVisita } from '../../components/acciones-visita/acciones-visita';
import {
  aFilaVista,
  opcionesVisitadores,
  TIPOS_SOLICITUD_TODAS,
  urlRadicado,
  VisitaFilaVista,
} from '../../listado/listado-visita';

/** Visitas Emitidas: Visitas en estado «Emitido» (SAUL: listarVisitaTodo?emitir). */
@Component({
  selector: 'app-visitas-emitidas',
  imports: [Table, AccionesVisita],
  templateUrl: './visitas-emitidas.html',
  styleUrl: './visitas-emitidas.css',
})
export class VisitasEmitidas implements OnInit {
  private readonly visitaService = inject(VisitaService);

  readonly titulo = 'Visitas Emitidas';
  readonly filas = signal<VisitaFilaVista[]>([]);
  readonly total = signal(0);
  readonly cargando = signal(false);
  readonly error = signal('');
  /** Visita con el modal de acciones abierto. */
  readonly visitaSeleccionada = signal<VisitaListadoFila | null>(null);

  page = 1;
  pageSize = 10;
  private filtros: Record<string, string> = {};

  private readonly visitadores = signal<OpcionFiltro[]>([]);
  private readonly celdaAcciones =
    viewChild<TemplateRef<{ $implicit: VisitaFilaVista }>>('celdaAcciones');
  private readonly celdaRadicado =
    viewChild<TemplateRef<{ $implicit: VisitaFilaVista }>>('celdaRadicado');

  /** Columnas de esta pantalla. Los filtros por columna solo van en campos que el backend sabe filtrar. */
  readonly columnas = computed<ColumnaTabla[]>(() => [
    { label: 'Acciones', campo: null, template: this.celdaAcciones(), width: '6%' },
    { label: 'No Visita', campo: 'idvisita', tipoFiltro: 'numerico', width: '7%' },
    { label: 'Dirección', campo: 'direccion', width: '15%' },
    { label: 'Radicado', campo: 'radicado', template: this.celdaRadicado(), width: '12%' },
    {
      label: 'Tipo Solicitud',
      campo: 'nombreTipoSolicitud',
      tipoFiltro: 'seleccion',
      options: TIPOS_SOLICITUD_TODAS,
      width: '13%',
    },
    // El estado es fijo («Emitido»): no se filtra por él en esta pantalla.
    { label: 'Estado', campo: 'nombreEstado', activateFilter: false, width: '10%' },
    {
      label: 'Visitador',
      campo: 'visitador',
      tipoFiltro: 'seleccion',
      options: this.visitadores(),
      width: '10%',
    },
    { label: 'Revisor', campo: 'supervisor', activateFilter: false, width: '10%' },
    {
      label: 'Fecha Actualización',
      campo: 'fechaActualizacionTexto',
      activateFilter: false,
      width: '10%',
    },
  ]);

  ngOnInit(): void {
    this.cargar();
  }

  onFiltersChange(evento: {
    filter: Record<string, string>;
    page: number;
    pageSize: number;
  }): void {
    this.filtros = evento.filter;
    this.page = evento.page;
    this.pageSize = evento.pageSize;
    this.cargar();
  }

  abrirAcciones(fila: VisitaListadoFila): void {
    this.visitaSeleccionada.set(fila);
  }

  urlRadicado = urlRadicado;

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.visitaService
      .listarEmitidas({ page: this.page, pageSize: this.pageSize, filtros: this.filtros })
      .subscribe({
        next: (r) => {
          this.filas.set((r?.data ?? []).map(aFilaVista));
          this.total.set(Number(r?.totalItems ?? 0));
          this.visitadores.set(opcionesVisitadores(r));
          this.cargando.set(false);
        },
        error: () => {
          this.filas.set([]);
          this.total.set(0);
          this.error.set('No fue posible consultar las visitas. Intente nuevamente.');
          this.cargando.set(false);
        },
      });
  }
}
