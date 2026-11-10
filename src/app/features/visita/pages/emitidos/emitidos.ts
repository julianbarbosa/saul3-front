import { Component, computed, inject, OnInit, signal, TemplateRef, viewChild } from '@angular/core';

import { VisitaListadoFila } from '../../../../core/interfaces/visita.interface';
import { EstilosVisitaService } from '../../../../core/services/estilos-visita.service';
import { VisitaService } from '../../../../core/services/visita.service';
import {
  ColumnaTabla,
  OpcionFiltro,
  OrdenTablaEvento,
  Table,
} from '../../../../shared/components/table/table';
import { AccionesVisita } from '../../components/acciones-visita/acciones-visita';
import {
  aFilaVista,
  claseFilaVisita,
  ORDEN_POR_DEFECTO,
  TAMANOS_PAGINA_VISITAS,
  opcionesVisitadores,
  TIPOS_SOLICITUD_TODAS,
  urlRadicado,
  VisitaFilaVista,
} from '../../listado/listado-visita';

/** Visitas Emitidas: Visitas en estado «Emitido» (SAUL: listarVisitaTodo?emitir). */
@Component({
  selector: 'app-emitidos',
  imports: [Table, AccionesVisita],
  templateUrl: './emitidos.html',
  styleUrl: './emitidos.css',
})
export class Emitidos implements OnInit {
  private readonly visitaService = inject(VisitaService);
  /** Etiquetas de estado y botones de la guía (KIT UI SAUL3). */
  readonly estilos = inject(EstilosVisitaService);

  readonly titulo = 'Visitas Emitidas';
  readonly filas = signal<VisitaFilaVista[]>([]);
  readonly total = signal(0);
  readonly cargando = signal(false);
  readonly error = signal('');
  /** Visita con el modal de acciones abierto. */
  readonly visitaSeleccionada = signal<VisitaListadoFila | null>(null);

  page = 1;
  pageSize = 10;
  orderBy: string = ORDEN_POR_DEFECTO.campo;
  orderDir: 'ASC' | 'DESC' = ORDEN_POR_DEFECTO.direccion;
  readonly tamanosPagina = TAMANOS_PAGINA_VISITAS;
  readonly claseFila = claseFilaVisita;
  private filtros: Record<string, string> = {};

  private readonly visitadores = signal<OpcionFiltro[]>([]);
  private readonly celdaAcciones =
    viewChild<TemplateRef<{ $implicit: VisitaFilaVista }>>('celdaAcciones');
  private readonly celdaRadicado =
    viewChild<TemplateRef<{ $implicit: VisitaFilaVista }>>('celdaRadicado');
  private readonly celdaEstado =
    viewChild<TemplateRef<{ $implicit: VisitaFilaVista }>>('celdaEstado');

  /** Columnas de esta pantalla. Los filtros por columna solo van en campos que el backend sabe filtrar. */
  readonly columnas = computed<ColumnaTabla[]>(() => [
    { label: 'Acciones', campo: null, template: this.celdaAcciones() },
    { label: 'No Visita', campo: 'idvisita', sortable: true, tipoFiltro: 'numerico' },
    { label: 'Dirección', campo: 'direccion', sortable: true },
    { label: 'Radicado', campo: 'radicado', sortable: true, template: this.celdaRadicado() },
    {
      label: 'Tipo Solicitud',
      campo: 'nombreTipoSolicitud',
      sortable: true,
      tipoFiltro: 'seleccion',
      options: TIPOS_SOLICITUD_TODAS,
    },
    // El estado es fijo («Emitido»): no se filtra por él en esta pantalla.
    { label: 'Estado', campo: 'nombreEstado', template: this.celdaEstado(), activateFilter: false },
    {
      label: 'Visitador',
      campo: 'visitador',
      sortable: true,
      tipoFiltro: 'seleccion',
      options: this.visitadores(),
    },
    // La fila trae «supervisor»; saul2 filtra y ordena por «revisor».
    { label: 'Revisor', campo: 'supervisor', campoConsulta: 'revisor', sortable: true },
    {
      label: 'Fecha Actualización',
      campo: 'fechaActualizacionTexto',
      activateFilter: false,
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

  onSortChange(orden: OrdenTablaEvento): void {
    this.orderBy = orden.campo;
    this.orderDir = orden.direccion;
    this.page = 1;
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
      .listarEmitidas({
        page: this.page,
        pageSize: this.pageSize,
        filtros: this.filtros,
        orderBy: this.orderBy,
        orderDir: this.orderDir,
      })
      .subscribe({
        next: (r) => {
          if (r?.success === false) {
            // saul2 responde 200 con { success: false, msg } cuando no reconoce al usuario.
            this.filas.set([]);
            this.total.set(0);
            this.error.set(r.msg || 'El servidor no devolvió visitas.');
            this.cargando.set(false);
            return;
          }
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
