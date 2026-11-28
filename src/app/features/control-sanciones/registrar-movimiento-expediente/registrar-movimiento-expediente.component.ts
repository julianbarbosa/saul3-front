import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
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
import { FormViewerField } from '../../../shared/components/form-viewer/form-viewer-field';
import { FormViewer } from '../../../shared/components/form-viewer/form-viewer';
import { PageHeader } from '../../../shared/components/header/header';
import { ModalMensajeComponent } from '../../../shared/components/modal-mensaje/modal-mensaje';
import { ColumnaTabla, Table } from '../../../shared/components/table/table';
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

interface HistorialTrasladoFila {
  id: number;
  estadoAnterior: string;
  estadoActual: string;
  usuario: string;
  comentario: string;
  fecha: string;
}

@Component({
  selector: 'app-registrar-movimiento-expediente',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HasPermissionDirective,
    PageHeader,
    ModalMensajeComponent,
    MascaraExpedienteDirective,
    Table,
    FormViewer,
  ],
  templateUrl: './registrar-movimiento-expediente.component.html',
  styleUrl: './registrar-movimiento-expediente.component.css',
})
export class RegistrarMovimientoExpedienteComponent implements OnInit, OnChanges {
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  readonly api = inject(ControlSancionesExpedienteService);
  readonly permisos = inject(PermisosService);

  /** Número de expediente al abrir embebido (p. ej. desde listado múltiple). */
  @Input() comparendoInicial: string | null = null;
  /** true = sin título de página; pensado para modal. */
  @Input() embebido = false;
  @Output() cerrado = new EventEmitter<void>();
  @Output() registroExitoso = new EventEmitter<void>();

  readonly ejemploNumeroExpediente = EJEMPLO_NUMERO_EXPEDIENTE;

  busqueda = { comparendo: PREFIJO_EXPEDIENTE };
  comparendo: ComparendoResumen | null = null;
  expediente: ExpedienteGestion | null = null;
  historial: MovimientoExpediente[] = [];
  historialPage = 1;
  historialPageSize = 10;
  readonly columnasHistorial: ColumnaTabla[] = [
    { label: 'Estado anterior', campo: 'estadoAnterior', activateFilter: false },
    { label: 'Estado actual', campo: 'estadoActual', activateFilter: false },
    { label: 'Usuario', campo: 'usuario', activateFilter: false },
    { label: 'Comentario', campo: 'comentario', activateFilter: false },
    { label: 'Fecha', campo: 'fecha', activateFilter: false },
  ];
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
  modalMensajeVisible = false;
  modalMensajeTitulo = 'Mensaje';
  modalMensajeTexto = '';
  modalMensajeVariante: 'info' | 'exito' | 'error' = 'info';
  private readonly tituloModalBusqueda = 'Búsqueda de expediente';
  private readonly tituloModalRegistro = 'Registro de movimiento';
  private modalTrasRegistroExitoso = false;
  private destruido = false;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.destruido = true;
    });
  }

  ngOnInit(): void {
    const desdeRuta = this.route.snapshot.queryParamMap.get('comparendo')?.trim();
    const inicial = this.comparendoInicial?.trim() || desdeRuta;
    if (inicial) {
      this.cargarComparendoInicial(inicial);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['comparendoInicial'] || changes['comparendoInicial'].firstChange) {
      return;
    }
    const valor = this.comparendoInicial?.trim();
    if (valor) {
      this.limpiar();
      this.cargarComparendoInicial(valor);
    }
  }

  private cargarComparendoInicial(comparendo: string): void {
    this.busqueda.comparendo = formatearNumeroExpediente(comparendo);
    // Se difiere para que la primera detección de cambios termine antes de buscar.
    setTimeout(() => this.buscar());
  }

  buscar(): void {
    const numero = formatearNumeroExpediente(this.busqueda.comparendo ?? '');
    this.busqueda.comparendo = numero;
    if (numero === PREFIJO_EXPEDIENTE) {
      this.mostrarModalMensaje(
        'Indique el número de expediente completo.',
        'error',
        this.tituloModalBusqueda,
      );
      return;
    }
    if (!esNumeroExpedienteFormatoCompleto(numero)) {
      this.mostrarModalMensaje(
        mensajeFormatoNumeroExpedienteInvalido(),
        'error',
        this.tituloModalBusqueda,
      );
      return;
    }
    this.data = { asignadoa: null };
    this.responsables = [];
    this.actualizarVista(() => {
      this.cargando = true;
      this.cargandoDetalle = false;
    });
    this.api.buscarComparendo(numero).subscribe({
      next: (res) => this.procesarBusquedaComparendo(res),
      error: () => {
        this.actualizarVista(() => {
          this.mostrarModalMensaje(
            'Error al consultar el comparendo.',
            'error',
            this.tituloModalBusqueda,
          );
          this.cargando = false;
        });
      },
    });
  }

  private procesarBusquedaComparendo(res: { success?: boolean; data?: ComparendoResumen; msg?: string }): void {
    if (!res.success || !res.data) {
      this.actualizarVista(() => {
        this.mostrarModalMensaje(
          res.msg ?? 'No se encontró información.',
          'error',
          this.tituloModalBusqueda,
        );
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
      this.historialPage = 1;
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
      historial: this.api.historialMovimientos(idComparendo).pipe(catchError(() => of([] as MovimientoExpediente[]))),
      pago: this.api.consultarPago(idComparendo).pipe(catchError(() => of(null))),
      fisico: this.api.consultarExpedienteFisico(idComparendo).pipe(
        catchError(() => of({ expedientefisico: 1 } as { expedientefisico?: number })),
      ),
    })
      .pipe(
        switchMap(({ expediente, historial, pago, fisico }) => {
          if (!this.debeCargarResponsables(expediente)) {
            return of({
              expediente,
              historial,
              pago,
              fisico,
              responsables: [] as ResponsableExpediente[],
            });
          }
          return this.api.listarResponsables().pipe(
            catchError(() => of([] as ResponsableExpediente[])),
            map((responsables) => ({ expediente, historial, pago, fisico, responsables })),
          );
        }),
      )
      .subscribe({
        next: ({ expediente, responsables, historial, pago, fisico }) => {
          if (!expediente) {
            this.actualizarVista(() => {
              this.cargandoDetalle = false;
              this.comparendo = comparendoResumen;
              this.expediente = null;
              this.historial = historial ?? [];
              this.historialPage = 1;
              this.responsables = this.normalizarResponsables(responsables);
              this.data.asignadoa = null;
            });
            return;
          }
          this.actualizarVista(() => {
            this.cargandoDetalle = false;
            this.comparendo = comparendoResumen;
            this.expediente = expediente;
            this.responsables = this.debeCargarResponsables(expediente)
              ? this.normalizarResponsables(responsables)
              : [];
            this.data.asignadoa = null;
            this.historial = historial ?? [];
            this.historialPage = 1;
            this.pago = pago?.dataPago ?? null;
            this.idPedagogia = pago?.idComparendoXProgramacionPedagogia ?? null;
            this.ultimaPedagogia = pago?.ultimaPedagogia ?? null;
            this.expedienteFisico = fisico?.expedientefisico ?? 1;
            this.esMultaEspecial = (comparendoResumen.expediente ?? '').startsWith('76-001-1');
          });
        },
        error: () => {
          this.actualizarVista(() => {
            this.cargandoDetalle = false;
            this.comparendo = comparendoResumen;
            this.mostrarModalMensaje(
              'Se encontró el comparendo, pero hubo un error al cargar el expediente. Intente de nuevo.',
              'error',
              this.tituloModalBusqueda,
            );
            this.expediente = null;
          });
        },
      });
  }

  /** Ingreso nuevo (sin expediente) o reingreso desde estado devuelto. */
  private debeCargarResponsables(expediente: ExpedienteGestion | null): boolean {
    if (expediente === null) {
      return true;
    }
    return expediente.estado?.codigo === 'devuelto';
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

  private mostrarModalMensaje(
    texto: string,
    variante: 'info' | 'exito' | 'error',
    titulo: string,
    trasRegistroExitoso = false,
  ): void {
    this.modalMensajeTitulo = titulo;
    this.modalMensajeTexto = texto;
    this.modalMensajeVariante = variante;
    this.modalTrasRegistroExitoso = trasRegistroExitoso;
    this.modalMensajeVisible = true;
  }

  private mostrarModalResultadoRegistro(texto: string, exito: boolean): void {
    this.mostrarModalMensaje(
      texto,
      exito ? 'exito' : 'error',
      this.tituloModalRegistro,
      exito,
    );
  }

  cerrarModalMensajeRegistro(): void {
    this.modalMensajeVisible = false;
    if (this.modalTrasRegistroExitoso) {
      this.modalTrasRegistroExitoso = false;
      this.limpiar();
      if (this.embebido) {
        this.registroExitoso.emit();
        this.cerrado.emit();
      }
    }
  }

  cerrarEmbebido(): void {
    this.limpiar();
    this.cerrado.emit();
  }

  limpiar(): void {
    this.data = {};
    this.historial = [];
    this.historialPage = 1;
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

  filasHistorial(): HistorialTrasladoFila[] {
    return this.historial.map((item, index) => ({
      id: index,
      estadoAnterior: item.estadoAnterior?.nombre ?? '',
      estadoActual: item.estadoActual?.nombre ?? '',
      usuario: `${item.sfGuardUser?.firstName ?? ''} ${item.sfGuardUser?.lastName ?? ''}`.trim(),
      comentario: item.comentario ?? '',
      fecha: this.fmt(item.createdAt),
    }));
  }

  filasHistorialPagina(): HistorialTrasladoFila[] {
    const inicio = (this.historialPage - 1) * this.historialPageSize;
    return this.filasHistorial().slice(inicio, inicio + this.historialPageSize);
  }

  onHistorialPaginacion(evento: { page: number; pageSize: number }): void {
    this.historialPage = evento.page;
    this.historialPageSize = evento.pageSize;
  }

  onHistorialCambioPagina(pagina: number): void {
    this.historialPage = pagina;
  }

  onHistorialCambioTamanoPagina(tamano: number): void {
    this.historialPageSize = tamano;
    this.historialPage = 1;
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

  expedienteFields(): FormViewerField[] {
    const exp = this.expediente;
    if (!exp) {
      return [];
    }
    const fields: FormViewerField[] = [];
    if (exp.id != null) {
      fields.push({ label: 'Id', value: exp.id, type: 'text', colMd: 6 });
    }
    const responsable = this.nombreResponsableExpediente();
    if (responsable) {
      fields.push({ label: 'Responsable', value: responsable, type: 'text', colMd: 6 });
    }
    if (exp.estado?.nombre) {
      fields.push({ label: 'Estado', value: exp.estado.nombre, type: 'text', colMd: 6 });
    }
    const numeroDecision = this.textoCampoExpediente(exp.numeroDecision);
    if (numeroDecision) {
      fields.push({ label: 'Número decisión', value: numeroDecision, type: 'text', colMd: 6 });
    }
    const folios = this.textoCampoExpediente(exp.numeroFolios);
    if (folios) {
      fields.push({ label: 'Folios', value: folios, type: 'text', colMd: 6 });
    }
    const fechaDecision = this.fechaExpedienteTexto(exp.fechaDecision);
    if (fechaDecision) {
      fields.push({ label: 'Fecha decisión', value: fechaDecision, type: 'text', colMd: 6 });
    }
    const fechaEjecutoria = this.fechaExpedienteTexto(exp.fechaEjecutoria);
    if (fechaEjecutoria) {
      fields.push({ label: 'Fecha ejecutoria', value: fechaEjecutoria, type: 'text', colMd: 6 });
    }
    return fields;
  }

  medidasCorrectivasComparendo(): ComparendoXMedidaCorrectivaResumen[] {
    return (
      this.comparendo?.medidasCorrectivas ??
      this.comparendo?.comparendoxmedidacorrectiva ??
      []
    );
  }

  comparendoFields(): FormViewerField[] {
    const c = this.comparendo;
    if (!c) {
      return [];
    }
    const tipoId = this.textoCampoComparendo(c.tipoidentificacioninfractor);
    const numeroId = this.textoCampoComparendo(c.identificacioninfractor);
    const identificacion =
      tipoId === '—' && numeroId === '—' ? '—' : `${tipoId} ${numeroId}`.replace(/\s+/g, ' ').trim();
    return [
      { label: 'Expediente', value: this.textoCampoComparendo(c.expediente), type: 'text', colMd: 6 },
      {
        label: 'Fecha comparendo',
        value: this.fechaHoraComparendo(c.fechacomparendo) || '—',
        type: 'text',
        colMd: 6,
      },
      { label: 'Identificación ', value: identificacion, type: 'text', colMd: 6 },
      { label: 'Nombre ', value: this.textoCampoComparendo(c.nombreInfractor), type: 'text', colMd: 6 },
    ];
  }

  readonly columnasMedidasCorrectivas: ColumnaTabla[] = [
    { label: 'Nombre medida', campo: 'nombreMedida', activateFilter: false },
    { label: 'Entidad remitido', campo: 'entidadRemitido', activateFilter: false }
  ];

  filasMedidasCorrectivas(): { id: number; entidadRemitido: string; nombreMedida: string }[] {
    return this.medidasCorrectivasComparendo().map((item, index) => ({
      id: item.id ?? index,
      entidadRemitido: this.textoCampoComparendo(item.entidadremitido),
      nombreMedida: item.medidaCorrectiva?.nombre ?? '—',
    }));
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