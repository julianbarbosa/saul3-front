import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { ControlSancionesExpedienteService } from '../../../core/services/control-sanciones-expediente.service';
import {
  ComparendoResumen,
  ComparendoXMedidaCorrectivaResumen,
  DatosMovimientoExpediente,
  ExpedienteGestion,
  MovimientoExpediente,
  PagoComparendoResumen,
  ResponsableExpediente,
  UltimaPedagogiaComparendo,
} from '../../../core/interfaces/control-sanciones-expediente.interface';
import {
  CRITERIOS_VERIFICACION_EXPEDIENTE,
  CriterioVerificacion,
} from '../constants/criterios-verificacion-expediente';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { PermisosService } from '../../../core/services/permisos.service';
import { ModalMensajeComponent } from '../../../shared/components/modal-mensaje/modal-mensaje';
import { MascaraExpedienteDirective } from './mascara-expediente.directive';
import {
  EJEMPLO_NUMERO_EXPEDIENTE,
  esNumeroExpedienteFormatoCompleto,
  formatearNumeroExpediente,
  mensajeFormatoNumeroExpedienteInvalido,
  PREFIJO_EXPEDIENTE,
} from '../utils/numero-expediente-formato.util';
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
  private readonly destroyRef = inject(DestroyRef);
  readonly api = inject(ControlSancionesExpedienteService);
  readonly permisos = inject(PermisosService);

  readonly ejemploNumeroExpediente = EJEMPLO_NUMERO_EXPEDIENTE;

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
  ultimaPedagogia: UltimaPedagogiaComparendo | null = null;
  pago: PagoComparendoResumen | null = null;
  cargando = false;
  cargandoDetalle = false;
  registrandoMovimiento = false;
  mensaje = '';
  modalMensajeVisible = false;
  modalMensajeTexto = '';
  modalMensajeVariante: 'info' | 'exito' | 'error' = 'info';
  private modalTrasRegistroExitoso = false;
  private destruido = false;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.destruido = true;
    });
  }

  ngOnInit(): void {
    const comparendo = this.route.snapshot.queryParamMap.get('comparendo')?.trim();
    if (comparendo) {
      this.busqueda.comparendo = formatearNumeroExpediente(comparendo);
      // Se difiere para que la primera detección de cambios termine antes de buscar.
      setTimeout(() => this.buscar());
    }
  }

  buscar(): void {
    const numero = formatearNumeroExpediente(this.busqueda.comparendo ?? '');
    this.busqueda.comparendo = numero;
    if (numero === PREFIJO_EXPEDIENTE) {
      this.mensaje = 'Indique el número de expediente completo.';
      return;
    }
    if (!esNumeroExpedienteFormatoCompleto(numero)) {
      this.mensaje = mensajeFormatoNumeroExpedienteInvalido();
      return;
    }
    this.data = { asignadoa: null };
    this.responsables = [];
    this.mensaje = '';
    this.actualizarVista(() => {
      this.cargando = true;
      this.cargandoDetalle = false;
    });
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
    this.actualizarVista(() => {
      this.cargandoDetalle = true;
    });
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
            this.data.asignadoa = null;
          });
          return;
        }
        this.actualizarVista(() => {
          this.cargandoDetalle = false;
          this.comparendo = comparendoResumen;
          this.expediente = expediente;
          this.responsables = this.normalizarResponsables(responsables);
          this.data.asignadoa = null;
          this.historial = historial ?? [];
          this.pago = pago?.dataPago ?? null;
          this.idPedagogia = pago?.idComparendoXProgramacionPedagogia ?? null;
          this.ultimaPedagogia = pago?.ultimaPedagogia ?? null;
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

  /**
   * Aplica los cambios de estado y fuerza una detección de cambios inmediata.
   * Se ejecuta fuera del ciclo de verificación (llamado desde callbacks de
   * suscripciones), por lo que evita NG0100 sin depender de setTimeout.
   */
  private actualizarVista(fn: () => void): void {
    if (this.destruido) {
      return;
    }
    fn();
    this.cdr.detectChanges();
  }

  compararValorNumerico(a: number | null | undefined, b: number | null | undefined): boolean {
    if (a == null || b == null) {
      return a === b;
    }
    return Number(a) === Number(b);
  }

  codigoEstadoExpediente(): string {
    return this.expediente?.estado?.codigo ?? '';
  }

  esResponsableActual(): boolean {
    return String(this.expediente?.responsable?.id ?? '') === String(this.permisos.userId() ?? '');
  }

  hayPagoExitoso(): boolean {
    return this.pago != null && (this.pago.id != null || this.pago.success === true);
  }

  actualizarEstadoRevision(): void {
    const revision = this.criterios.every((c) => c.checked === true);
    this.estadoRevision = revision;
    if (this.estadoRevision) {
      this.data.comentario = '';
    }
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
    if (!this.comparendo || this.registrandoMovimiento) {
      return;
    }
    this.actualizarVista(() => {
      this.registrandoMovimiento = true;
    });
    this.api
      .registrarMovimiento({
        idComparendo: this.comparendo.id,
        data: this.data,
        comentario: this.data.comentario,
        estado: codigoEstado,
      })
      .subscribe({
        next: (r) => {
          const exito = esRespuestaExitosaSaul2(r);
          this.actualizarVista(() => {
            this.registrandoMovimiento = false;
            this.mostrarModalResultadoRegistro(
              r.msg ?? (exito ? 'Se registró el movimiento.' : 'No se pudo registrar el movimiento.'),
              exito,
            );
          });
        },
        error: () => {
          this.actualizarVista(() => {
            this.registrandoMovimiento = false;
            this.mostrarModalResultadoRegistro('Error al registrar movimiento.', false);
          });
        },
      });
  }

  private mostrarModalResultadoRegistro(texto: string, exito: boolean): void {
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
    this.registrandoMovimiento = false;
  }

  limpiarDatos(): void {
    this.comparendo = null;
    this.expediente = null;
    this.ultimaPedagogia = null;
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

  fechaDia(val: unknown): string {
    const d = fechaDesdeLegacy(val as never);
    if (!d) {
      return '';
    }
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    return `${dia}/${mes}/${d.getFullYear()}`;
  }

  /** Fecha comparendo con hora (API: `Y-m-d H:i:s`). */
  fechaHoraComparendo(val: unknown): string {
    const d = fechaDesdeLegacy(val as never);
    if (!d) {
      return '';
    }
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const hora = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${d.getFullYear()} ${hora}:${min}`;
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

  medidasCorrectivasComparendo(): ComparendoXMedidaCorrectivaResumen[] {
    return (
      this.comparendo?.medidasCorrectivas ??
      this.comparendo?.comparendoxmedidacorrectiva ??
      []
    );
  }

  textoMonedaPago(val: number | null | undefined): string {
    if (val == null || !Number.isFinite(val)) {
      return '—';
    }
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
      val,
    );
  }

  fechaPagoTexto(fechapago: string | null | undefined): string {
    if (!fechapago?.trim()) {
      return '—';
    }
    const soloFecha = fechapago.trim().slice(0, 10);
    const partes = soloFecha.split('-');
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return this.textoCampoComparendo(fechapago);
  }

  textoCampoComparendo(val: string | number | null | undefined): string {
    if (val == null) {
      return '—';
    }
    if (typeof val === 'number') {
      return Number.isFinite(val) ? String(val) : '—';
    }
    const t = val.trim();
    return t.length > 0 ? t : '—';
  }

  textoIncrementoComparendo(): string {
    const p = this.comparendo?.porcentajeIncremento;
    if (p == null || !Number.isFinite(Number(p))) {
      return '—';
    }
    return `${p}%`;
  }

  textoSiNo(val: boolean | null | undefined): string {
    if (val === true) {
      return 'Sí';
    }
    if (val === false) {
      return 'No';
    }
    return '—';
  }
}