import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { ControlSancionesExpedienteService } from '../../../core/services/control-sanciones-expediente.service';
import {
  ComparendoResumen,
  DatosMovimientoExpediente,
  ExpedienteGestion,
  MovimientoExpediente,
  ResponsableExpediente,
} from '../../../core/interfaces/control-sanciones-expediente.interface';
import {
  CRITERIOS_VERIFICACION_EXPEDIENTE,
  CriterioVerificacion,
} from '../constants/criterios-verificacion-expediente';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { PermisosService } from '../../../core/services/permisos.service';
import { ModalMensajeComponent } from '../../../shared/components/modal-mensaje/modal-mensaje';
import {
  formatearNumeroExpediente,
  MascaraExpedienteDirective,
  PREFIJO_EXPEDIENTE,
} from './mascara-expediente.directive';
import {
  esRespuestaExitosaSaul2,
  fechaDesdeLegacy,
  fechaInputDesdeLegacy,
} from '../utils/fecha-saul2.util';

@Component({
  selector: 'app-registrar-movimiento-expediente',
  standalone: true,
  imports: [CommonModule, FormsModule, HasPermissionDirective, ModalMensajeComponent, MascaraExpedienteDirective],
  templateUrl: './registrar-movimiento-expediente.component.html',
  styleUrl: './registrar-movimiento-expediente.component.css',
})
export class RegistrarMovimientoExpedienteComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly api = inject(ControlSancionesExpedienteService);
  readonly permisos = inject(PermisosService);

  busqueda = { comparendo: PREFIJO_EXPEDIENTE };
  comparendo: ComparendoResumen | null = null;
  expediente: ExpedienteGestion | null = null;
  historial: MovimientoExpediente[] = [];
  responsables: ResponsableExpediente[] = [];
  criterios: CriterioVerificacion[] = structuredClone(CRITERIOS_VERIFICACION_EXPEDIENTE);
  data: DatosMovimientoExpediente = {};
  estadoRevision = false;
  esMultaEspecial = false;
  expedienteFisico = 1;
  idPedagogia: number | null = null;
  pago: { success?: boolean; msg?: string } | null = null;
  cargando = false;
  cargandoDetalle = false;
  mensaje = '';
  modalMensajeVisible = false;
  modalMensajeTexto = '';
  modalMensajeVariante: 'info' | 'exito' | 'error' = 'info';
  private modalTrasRegistroExitoso = false;

  ngOnInit(): void {
    const comparendo = this.route.snapshot.queryParamMap.get('comparendo')?.trim();
    if (comparendo) {
      this.busqueda.comparendo = formatearNumeroExpediente(comparendo);
      setTimeout(() => this.buscar());
    }
  }

  buscar(): void {
    const numero = formatearNumeroExpediente(this.busqueda.comparendo ?? '');
    this.busqueda.comparendo = numero;
    if (numero === PREFIJO_EXPEDIENTE) {
      return;
    }
    this.cargando = true;
    this.mensaje = '';
    this.api.buscarComparendo(numero).subscribe({
      next: (res) => this.procesarBusquedaComparendo(res),
      error: () => {
        this.actualizarVista(() => {
          this.mensaje = 'Error al consultar el comparendo.';
          this.cargando = false;
        });
      },
    });
  }

  private procesarBusquedaComparendo(res: { success?: boolean; data?: ComparendoResumen; msg?: string }): void {
    if (!res.success || !res.data) {
      this.actualizarVista(() => {
        this.mensaje = res.msg ?? 'No se encontró información.';
        this.limpiarDatos();
        this.cargando = false;
      });
      return;
    }
    this.actualizarVista(() => {
      this.comparendo = res.data!;
      this.busqueda.comparendo = res.data!.expediente ?? res.data!.numeroformato ?? '';
      this.expediente = null;
      this.historial = [];
      this.cargando = false;
    });
    this.cargarDetalle(res.data.id, res.data);
  }

  private cargarDetalle(idComparendo: number, comparendoResumen: ComparendoResumen): void {
    this.cargandoDetalle = true;
    forkJoin({
      expediente: this.api.obtenerExpedientePorComparendo(idComparendo).pipe(catchError(() => of(null))),
      responsables: this.api.listarResponsables().pipe(catchError(() => of([] as ResponsableExpediente[]))),
      historial: this.api.historialMovimientos(idComparendo).pipe(catchError(() => of([] as MovimientoExpediente[]))),
      pago: this.api.consultarPago(idComparendo).pipe(catchError(() => of(null))),
      fisico: this.api.consultarExpedienteFisico(idComparendo).pipe(
        catchError(() => of({ expedientefisico: 1 } as { expedientefisico?: number })),
      ),
    }).subscribe({
      next: ({ expediente, responsables, historial, pago, fisico }) => {
        if (!expediente) {
          this.actualizarVista(() => {
            this.cargandoDetalle = false;
            this.comparendo = comparendoResumen;
            this.mensaje =
              'El comparendo existe pero no tiene expediente de control de sanciones activo (no anulado/rechazado).';
            this.expediente = null;
            this.historial = historial ?? [];
            this.responsables = this.normalizarResponsables(responsables);
          });
          return;
        }
        this.actualizarVista(() => {
          this.cargandoDetalle = false;
          this.comparendo = comparendoResumen;
          this.expediente = expediente;
          this.responsables = this.normalizarResponsables(responsables);
          this.historial = historial ?? [];
          this.pago = pago?.dataPago ?? null;
          this.idPedagogia = pago?.idComparendoXProgramacionPedagogia ?? null;
          this.expedienteFisico = fisico?.expedientefisico ?? 1;
          this.esMultaEspecial = (comparendoResumen.expediente ?? '').startsWith('76-001-1');
          this.mensaje = '';
        });
      },
      error: () => {
        this.actualizarVista(() => {
          this.cargandoDetalle = false;
          this.comparendo = comparendoResumen;
          this.mensaje =
            'Se encontró el comparendo, pero hubo un error al cargar el expediente. Intente de nuevo.';
          this.expediente = null;
        });
      },
    });
  }

  private normalizarResponsables(
    list: ResponsableExpediente[] | null | undefined,
  ): ResponsableExpediente[] {
    return (list ?? []).map((r) => ({
      id: Number(r.id),
      nombre: r.nombre,
    }));
  }

  /** Evita NG0100: cambios de plantilla fuera del ciclo de verificación de Angular. */
  private actualizarVista(fn: () => void): void {
    setTimeout(() => {
      fn();
      this.cdr.detectChanges();
    });
  }

  codigoEstadoExpediente(): string {
    return this.expediente?.estado?.codigo ?? '';
  }

  esResponsableActual(): boolean {
    return String(this.expediente?.responsable?.id ?? '') === String(this.permisos.userId() ?? '');
  }

  hayPagoExitoso(): boolean {
    return this.pago?.success === true;
  }

  actualizarEstadoRevision(): void {
    const revision = this.criterios.every((c) => c.checked === true);
    this.actualizarVista(() => {
      this.estadoRevision = revision;
      if (this.estadoRevision) {
        this.data.comentario = '';
      }
    });
  }

  generarTextoDevolucion(): void {
    const text = this.criterios
      .filter((c) => !c.checked)
      .map((c) => c.nombre)
      .join(', ');
    this.actualizarVista(() => {
      this.data.comentario = text;
    });
  }

  longitudComentarioDevolucion(): number {
    return this.data.comentario?.length ?? 0;
  }

  rechazoExpedienteDeshabilitado(): boolean {
    return this.longitudComentarioDevolucion() < 5;
  }

  registrarMovimiento(codigoEstado: string): void {
    if (!this.comparendo) {
      return;
    }
    this.cargando = true;
    this.api
      .registrarMovimiento({
        idComparendo: this.comparendo.id,
        data: this.data,
        comentario: this.data.comentario,
        estado: codigoEstado,
      })
      .subscribe({
        next: (r) => {
          this.actualizarVista(() => {
            this.cargando = false;
            const exito = esRespuestaExitosaSaul2(r);
            this.mostrarModalResultadoRegistro(
              r.msg ?? (exito ? 'Se registró el movimiento.' : 'No se pudo registrar el movimiento.'),
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
    this.data = {};
    this.historial = [];
    this.comparendo = null;
    this.expediente = null;
    this.busqueda = { comparendo: PREFIJO_EXPEDIENTE };
    this.criterios = structuredClone(CRITERIOS_VERIFICACION_EXPEDIENTE);
    this.estadoRevision = false;
  }

  limpiarDatos(): void {
    this.comparendo = null;
    this.expediente = null;
  }

  fechaMinComparendo(): string {
    if (this.esMultaEspecial) {
      return '';
    }
    const fc = this.expediente?.comparendo?.fechaComparendo ?? this.comparendo?.fechacomparendo;
    return fechaInputDesdeLegacy(fc);
  }

  fmt(val: unknown): string {
    const d = fechaDesdeLegacy(val as never);
    return d ? d.toLocaleString('es-CO') : '';
  }

  textoCampoExpediente(val: string | number | null | undefined): string | null {
    if (val == null) {
      return null;
    }
    if (typeof val === 'number') {
      return Number.isFinite(val) ? String(val) : null;
    }
    const t = val.trim();
    return t.length > 0 ? t : null;
  }

  fechaExpedienteTexto(val: unknown): string | null {
    const s = this.fmt(val);
    return s.length > 0 ? s : null;
  }

  nombreResponsableExpediente(): string | null {
    const r = this.expediente?.responsable;
    if (!r) {
      return null;
    }
    const nombre = [r.firstName, r.lastName].filter((p) => !!p?.trim()).join(' ').trim();
    return nombre.length > 0 ? nombre : null;
  }
}