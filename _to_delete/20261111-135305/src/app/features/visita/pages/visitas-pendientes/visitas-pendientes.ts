import { Component, computed, inject, OnInit, signal, TemplateRef, viewChild } from '@angular/core';

import { VisitaListadoFila } from '../../../../core/interfaces/visita.interface';
import { VisitaService } from '../../../../core/services/visita.service';
import { ColumnaTabla, OpcionFiltro, Table } from '../../../../shared/components/table/table';
import { AccionesVisita } from '../../components/acciones-visita/acciones-visita';
import {
  aFilaVista,
  opcionesEstados,
  opcionesVisitadores,
  TIPOS_SOLICITUD_PENDIENTES,
  urlRadicado,
  VisitaFilaVista,
} from '../../listado/listado-visita';

/** Visitas Pendientes: Visitas que el usuario tiene por gestionar (SAUL: listarVisita). */
@Component({
  selector: 'app-visitas-pendientes',
  imports: [Table, AccionesVisita],
  templateUrl: './visitas-pendientes.html',
  styleUrl: './visitas-pendientes.css',
})
export class VisitasPendientes implements OnInit {
  private readonly visitaService = inject(VisitaService);

  readonly titulo = 'Visitas Pendientes';
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
  private readonly estados = signal<OpcionFiltro[]>([]);
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
      options: TIPOS_SOLICITUD_PENDIENTES,
      width: '13%',
    },
    {
      label: 'Estado',
      campo: 'nombreEstado',
      tipoFiltro: 'seleccion',
      options: this.estados(),
      width: '10%',
    },
    {
      label: 'Visitador',
      campo: 'visitador',
      tipoFiltro: 'seleccion',
      options: this.visitadores(),
      width: '10%',
    },
    { label: 'Fecha Visita', campo: 'fechaVisitaTexto', activateFilter: false, width: '9%' },
    { label: 'Revisor', campo: 'supervisor', activateFilter: false, width: '10%' },
    { label: 'Fecha Revisión', campo: 'fechaRevisionTexto', activateFilter: false, width: '9%' },
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
      .listarPendientes({ page: this.page, pageSize: this.pageSize, filtros: this.filtros })
      .subscribe({
        next: (r) => {
          this.filas.set((r?.data ?? []).map(aFilaVista));
          this.total.set(Number(r?.totalItems ?? 0));
          this.visitadores.set(opcionesVisitadores(r));
          this.estados.set(opcionesEstados(r));
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
