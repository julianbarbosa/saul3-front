import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  OnInit,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ControlSancionesExpedienteService } from '../../../core/services/control-sanciones-expediente.service';
import {
  ExpedienteListadoItem,
  InspeccionItem,
} from '../../../core/interfaces/control-sanciones-expediente.interface';
import { PermisosService } from '../../../core/services/permisos.service';
import { PageHeader } from '../../../shared/components/header/header';
import { ModalMensajeComponent } from '../../../shared/components/modal-mensaje/modal-mensaje';
import {
  ColumnaTabla,
  Table,
} from '../../../shared/components/table/table';
import { RegistrarMovimientoExpedienteComponent } from '../registrar-movimiento-expediente/registrar-movimiento-expediente.component';
import { esRespuestaExitosaSaul2, fechaDesdeLegacy } from '../utils/fecha-saul2.util';

const ESTADOS_EXPEDIENTE = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'aprobada', label: 'Aprobado' },
  { value: 'rechazado', label: 'Rechazado' },
  { value: 'enviadotesoreria', label: 'Enviado a tesorería' },
  { value: 'cerrarporpago', label: 'Cerrado por pago' },
  { value: 'devueltoportesoreria', label: 'Devuelto por tesorería' },
] as const;

const TAMANOS_PAGINA = [10, 20, 50];

export type ExpedienteFilaVista = ExpedienteListadoItem & {
  updatedAtTexto: string;
};

@Component({
  selector: 'app-registrar-movimiento-expediente-multiple',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageHeader,
    ModalMensajeComponent,
    Table,
    RegistrarMovimientoExpedienteComponent,
  ],
  templateUrl: './registrar-movimiento-expediente-multiple.component.html',
  styleUrl: './registrar-movimiento-expediente-multiple.component.css',
})
export class RegistrarMovimientoExpedienteMultipleComponent implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);

  readonly api = inject(ControlSancionesExpedienteService);
  readonly estados = ESTADOS_EXPEDIENTE;
  readonly permisos = inject(PermisosService);
  readonly tamanosPagina = TAMANOS_PAGINA;

  busqueda: { estado?: string; inspeccion?: number | null } = {};
  private readonly estadoActivo = signal<string | undefined>(undefined);
  private readonly todasLasFilas = signal<ExpedienteFilaVista[]>([]);
  inspecciones: InspeccionItem[] = [];
  private readonly filtrosColumna = signal<Record<string, string>>({});
  idsSeleccionadosKeys: string[] = [];
  page = 1;
  pageSize = 10;
  cargando = false;
  mensaje = '';
  modalMensajeVisible = false;
  modalMensajeTexto = '';
  modalMensajeVariante: 'info' | 'exito' | 'error' = 'info';
  private modalTrasRegistroExitoso = false;
  busquedaRealizada = false;
  /** Expediente abierto en el modal de gestión (pendiente). */
  comparendoModal: string | null = null;

  private readonly celdaAccion =
    viewChild<TemplateRef<{ $implicit: ExpedienteFilaVista }>>('celdaAccion');

  readonly columnas = computed<ColumnaTabla[]>(() => {
    const cols: ColumnaTabla[] = [
      { label: 'Comparendo', campo: 'formato', width: '28%' },
      { label: 'Nombre infractor', campo: 'nombre', width: '42%' },
      {
        label: 'Actualización',
        campo: 'updatedAtTexto',
        width: '30%',
        activateFilter: false,
      },
    ];
    if (this.estadoActivo() === 'pendiente') {
      cols[0] = { ...cols[0], width: '26%' };
      cols[1] = { ...cols[1], width: '40%' };
      cols[2] = { ...cols[2], width: '24%' };
      cols.push({
        label: 'Acción',
        campo: null,
        width: '10%',
        activateFilter: false,
        template: this.celdaAccion(),
      });
    }
    return cols;
  });

  readonly filasFiltradas = computed(() => {
    const filtros = this.filtrosColumna();
    const idFiltro = (filtros['id'] ?? '').trim();
    const formatoFiltro = (filtros['formato'] ?? '').trim();
    const nombreFiltro = (filtros['nombre'] ?? '').trim().toLowerCase();

    return this.todasLasFilas().filter((item) => {
      const idOk = !idFiltro || String(item.id).includes(idFiltro);
      const fmtOk = !formatoFiltro || (item.formato ?? '').includes(formatoFiltro);
      const nomOk =
        !nombreFiltro || (item.nombre ?? '').toLowerCase().includes(nombreFiltro);
      return idOk && fmtOk && nomOk;
    });
  });

  readonly total = computed(() => this.filasFiltradas().length);

  readonly filasPagina = computed(() => {
    const inicio = (this.page - 1) * this.pageSize;
    return this.filasFiltradas().slice(inicio, inicio + this.pageSize);
  });

  readonly cantidadCheckeado = computed(() => this.idsSeleccionadosKeys.length);

  ngOnInit(): void {
    this.seleccionarEstado('pendiente');
    this.api.listarInspecciones().subscribe((filas) => {
      this.actualizarVista(() => {
        this.inspecciones = filas;
      });
    });
  }

  private actualizarVista(fn: () => void): void {
    setTimeout(() => {
      fn();
      this.cdr.detectChanges();
    });
  }

  esPendiente(): boolean {
    return this.estadoActivo() === 'pendiente';
  }

  mostrarCheckboxes(): boolean {
    const estado = this.estadoActivo();
    return !!estado && estado !== 'pendiente';
  }

  requiereInspeccion(): boolean {
    return this.requiereInspeccionPara(this.busqueda.estado ?? '');
  }

  seleccionarEstado(estado: string): void {
    if (this.busqueda.estado === estado && this.busquedaRealizada) {
      return;
    }
    this.busqueda = {
      estado,
      inspeccion: this.requiereInspeccionPara(estado)
        ? (this.busqueda.inspeccion ?? null)
        : null,
    };
    this.estadoActivo.set(estado);
    this.todasLasFilas.set([]);
    this.idsSeleccionadosKeys = [];
    this.filtrosColumna.set({});
    this.page = 1;
    this.busquedaRealizada = false;
    this.mensaje = '';
    if (!this.requiereInspeccion()) {
      this.buscar();
    }
  }

  private requiereInspeccionPara(estado: string): boolean {
    return estado === 'rechazado' || estado === 'cerrarporpago' || estado === 'enviadotesoreria';
  }

  buscar(): void {
    if (!this.busqueda.estado) {
      return;
    }
    this.cargando = true;
    this.mensaje = '';
    this.busquedaRealizada = false;
    this.idsSeleccionadosKeys = [];
    this.api
      .listarExpedientesPorEstado(this.busqueda.estado, this.busqueda.inspeccion ?? '')
      .subscribe({
        next: (filas) => {
          this.actualizarVista(() => {
            this.busquedaRealizada = true;
            this.page = 1;
            this.todasLasFilas.set(
              filas.map((row) => ({
                ...row,
                isChecked: false,
                updatedAtTexto: this.fmt(row.updatedAt),
              })),
            );
            this.cargando = false;
          });
        },
        error: () => {
          this.actualizarVista(() => {
            this.mensaje = 'Error al consultar expedientes.';
            this.cargando = false;
          });
        },
      });
  }

  onPaginacion(evento: {
    filter: Record<string, string>;
    page: number;
    pageSize: number;
  }): void {
    this.filtrosColumna.set(evento.filter ?? {});
    this.page = evento.page;
    this.pageSize = evento.pageSize;
  }

  onCambioPagina(pagina: number): void {
    this.page = pagina;
  }

  onCambioTamanoPagina(tamano: number): void {
    this.pageSize = tamano;
    this.page = 1;
  }

  onSeleccionChange(ids: string[]): void {
    this.idsSeleccionadosKeys = ids;
  }

  idsSeleccionados(): number[] {
    return this.idsSeleccionadosKeys
      .map((id) => Number(id))
      .filter((id) => !Number.isNaN(id));
  }

  registrarMovimiento(codigoEstado: string): void {
    const ids = this.idsSeleccionados();
    if (!ids.length) {
      this.mensaje = 'Seleccione al menos un expediente.';
      return;
    }
    this.cargando = true;
    this.api
      .registrarMovimientoMultiple({
        idComparendo: null,
        data: ids,
        comentario: '',
        estado: codigoEstado,
      })
      .subscribe({
        next: (r) => {
          this.actualizarVista(() => {
            this.cargando = false;
            const exito = esRespuestaExitosaSaul2(r);
            this.mostrarModalResultadoRegistro(
              r.msg ??
                (exito
                  ? 'Se registró el movimiento.'
                  : 'No se pudo registrar el movimiento.'),
              exito,
            );
          });
        },
        error: () => {
          this.actualizarVista(() => {
            this.cargando = false;
            this.mostrarModalResultadoRegistro('Error al registrar movimiento.', false);
          });
        },
      });
  }

  mostrarModalResultadoRegistro(texto: string, exito: boolean): void {
    this.modalMensajeTexto = texto;
    this.modalMensajeVariante = exito ? 'exito' : 'error';
    this.modalTrasRegistroExitoso = exito;
    this.modalMensajeVisible = true;
  }

  cerrarModalMensajeRegistro(): void {
    this.modalMensajeVisible = false;
    if (this.modalTrasRegistroExitoso) {
      this.modalTrasRegistroExitoso = false;
      this.limpiar();
    }
  }

  limpiar(): void {
    this.todasLasFilas.set([]);
    this.busqueda = {};
    this.estadoActivo.set(undefined);
    this.filtrosColumna.set({});
    this.idsSeleccionadosKeys = [];
    this.page = 1;
    this.busquedaRealizada = false;
    this.mensaje = '';
    this.comparendoModal = null;
  }

  fmt(val: unknown): string {
    const d = fechaDesdeLegacy(val as never);
    return d ? d.toLocaleString('es-CO') : '';
  }

  abrirModalGestion(fila: ExpedienteFilaVista): void {
    this.comparendoModal = fila.expediente?.trim() || fila.formato || null;
  }

  cerrarModalGestion(): void {
    this.comparendoModal = null;
  }

  onRegistroExitosoModal(): void {
    this.comparendoModal = null;
    if (this.busqueda.estado) {
      this.buscar();
    }
  }
}
