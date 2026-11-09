import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { GestionMultaComponent } from '../components/gestion-multa/gestion-multa.component';
import { GestionPedagogiaComponent } from '../components/gestion-pedagogia/gestion-pedagogia.component';
import {
  PedagogiaService,
  ProgramacionDetalle,
  ProgramacionPedagogia,
} from 'src/app/core/services/pedagogia.service';
import { CrearObjecionService } from 'src/app/core/services/crear-objecion.service';
import { CrearReciboPagoService } from 'src/app/core/services/crear-recibo.service';
import {
  Comparendo,
  ComparendoDetalle,
  ComparendoService,
  MedidaCorrectiva,
} from 'src/app/core/services/comparendo.service';
import { BusquedaStateService } from 'src/app/core/services/busqueda-state.service';
import {
  marcarAccesoPublicoCodigoPolicia,
  rutasCodigoPolicia,
  RutasCodigoPoliciaCtx,
} from 'src/app/core/helpers/codigo-policia-route.helper';

interface InformacionPago {
  valorBase: number;
  porcentajeDescuentoProntoPago: number;
  valorDescuentoProntoPago: number;
  valorAPagarConDescuento: number;
  valorAPagarSinDescuento: number;
  fechaLimiteDescuento: string;
  fechaLimitePago: string;
  moneda: string;
}

const DESCRIPCION_DESTRUCCION_DE_BIEN =
  'Medida correctiva de la Ley 1801 de 2016 mediante la cual la autoridad de Policía destruye, total o parcialmente, un bien que representa riesgo para la salud, la seguridad o la convivencia, o cuya tenencia, uso o comercialización es contraria a la ley. Generalmente se aplica después del decomiso. Se resuelve identificando el bien en el comparendo o acta de decomiso, obteniendo la orden de la autoridad competente dentro del proceso verbal, ejecutando la destrucción con el método adecuado, levantando un acta con evidencia (fotografías o video, fecha y responsables) y registrando el cumplimiento en el expediente. Con ese registro la medida se cierra, condición necesaria para cerrar el comparendo cuando tiene varias medidas.';

const MEDIDA_PEDAGOGIA_PARTICIPACION =
  'Participación en programa comunitario o actividad pedagógica de convivencia';

const DESCRIPCION_AMONESTACION =
  'Consistente en un llamado de atención formal, verbal o escrito, que la autoridad de Policía hace al infractor para que reflexione sobre su comportamiento contrario a la convivencia y no lo repita, con enfoque preventivo y pedagógico.';

@Component({
  selector: 'app-detalle-comparendo',
  imports: [CommonModule, FormsModule, GestionMultaComponent, GestionPedagogiaComponent],
  templateUrl: './detalle-comparendo.component.html',
  styleUrls: ['./detalle-comparendo.component.sass'],
})
export class DetalleComparendoComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private pedagogiaService = inject(PedagogiaService);
  private crearObjecionService = inject(CrearObjecionService);
  private crearReciboService = inject(CrearReciboPagoService);
  private comparendoService = inject(ComparendoService);
  private busquedaState = inject(BusquedaStateService);

  comparendoIdParam: string | null = null;
  identificacionParam: string | null = null;
  cargando = signal(true);
  errorAlCargar = signal(false);
  infoLegalCollapsed = true;
  puedeObjetar = signal(false);
  objecionValidacion = signal<{
    success: boolean;
    msg?: string;
    diasHabiles?: number;
    maxDiasObjecion?: number;
    fechaComparendo?: string;
  } | null>(null);

  infoPago = signal<InformacionPago | null>(null);
  comparendo = signal<Comparendo | null>(null);
  infoPedagogia = signal<ProgramacionPedagogia | null>(null);

  mostrarModalObjecion = false;
  pasoModalObjecion: 1 | 2 = 1;
  aceptaAdvertencia = false;

  private ctxNavegacion(): RutasCodigoPoliciaCtx {
    return { route: this.route, busquedaState: this.busquedaState };
  }

  ngOnInit(): void {
    marcarAccesoPublicoCodigoPolicia(this.router, this.route, this.busquedaState);
    this.identificacionParam = this.busquedaState.identificacion;

    const comparendoId = this.busquedaState.comparendoId;
    if (comparendoId != null && comparendoId > 0) {
      this.cargarDetalle(comparendoId);
    } else {
      this.cargando.set(false);
      this.errorAlCargar.set(true);
    }
  }

  cargarDetalle(comparendoId: number): void {
    this.cargando.set(true);
    this.errorAlCargar.set(false);

    this.comparendoService.getDetalleComparendo(comparendoId).subscribe({
      next: (response) => {
        const data = response.data as ComparendoDetalle;
        if (data) {
          this.procesarComparendo(data);
        } else {
          this.errorAlCargar.set(true);
          this.cargando.set(false);
        }
      },
      error: (err: unknown) => {
        console.error('Error al consultar el detalle:', err);
        this.errorAlCargar.set(true);
        this.cargando.set(false);
      },
    });
  }

  private procesarComparendo(data: ComparendoDetalle): void {
    const info = data.informacionComparendo as Record<string, unknown>;

    const mapped: Comparendo = {
      comparendoId: data.comparendo,
      numeroFormato: data.expediente,
      expediente: data.expediente,
      numeroExpediente: data.expediente,
      fechaComparendo:
        (info['fechaComparendo'] as string | null | undefined) ??
        (info['fecha_comparendo'] as string | null | undefined) ??
        (info['fecha'] as string | null | undefined) ??
        '',
      identificacion: (info['identificacion'] as string | undefined) ?? '',
      conmutar: (info['conmutar'] as string | undefined) ?? '0',
      tienePedagogia:
        (info['tienePedagogia'] as number | undefined) ??
        (info['tiene_pedagogia'] as number | undefined) ??
        0,
      inspeccion: (info['inspeccion'] as string | undefined) ?? 'N/A',
      descripcion: (info['descripcion'] as string | undefined) ?? 'Sin descripción',
      pedagogiaId:
        (info['pedagogiaId'] as number | null | undefined) ??
        (info['pedagogia_id'] as number | null | undefined) ??
        null,
      pedagogiaEstado:
        (info['pedagogiaEstado'] as number | null | undefined) ??
        (info['pedagogia_estado'] as number | null | undefined) ??
        (info['pedagogia'] as { idestado?: number } | undefined)?.idestado ??
        null,
      pedagogia: (info['pedagogia'] as Comparendo['pedagogia']) ?? null,
      fechaPago:
        (info['fechaPago'] as string | null | undefined) ??
        (info['fecha_pago'] as string | null | undefined) ??
        null,
      comportamientocontrario:
        (info['comportamientocontrario'] as string | undefined) ??
        (info['comportamientoContrario'] as string | undefined) ??
        (info['comportamiento_contrario'] as string | undefined) ??
        'N/A',
      diasHabiles:
        (info['diasHabiles'] as number | undefined) ??
        (info['dias_habiles'] as number | undefined) ??
        0,
      estado: (info['estado'] as string | undefined) ?? 'Pendiente',
      descuentoLey2197: (info['descuentoLey2197'] as number | undefined) ?? 0,
      objecionId:
        this.busquedaState.objecionId ??
        (info['idObjecion'] as number | null | undefined) ??
        (info['objecionId'] as number | null | undefined) ??
        (info['objecion_id'] as number | null | undefined) ??
        (info['objecion'] as { id?: number } | undefined)?.id ??
        null,
      fechaObjecion:
        this.busquedaState.fechaObjecion ??
        (info['fechaObjecion'] as string | null | undefined) ??
        (info['fecha_objecion'] as string | null | undefined) ??
        (info['objecion'] as { fechaobjecion?: string; fecha_objecion?: string } | undefined)?.fechaobjecion ??
        (info['objecion'] as { fecha_objecion?: string } | undefined)?.fecha_objecion ??
        null,
      medidasCorrectivas: this.ordenarMedidasCorrectivas(
        ((data as unknown as Record<string, unknown>)['medidasCorrectivas'] as MedidaCorrectiva[] | undefined) ??
          (info['medidasCorrectivas'] as MedidaCorrectiva[] | undefined) ??
          (info['medidas_correctivas'] as MedidaCorrectiva[] | undefined) ??
          [],
      ),
    };
    this.comparendo.set(mapped);

    this.infoPago.set({
      valorBase: data.totalPagar,
      porcentajeDescuentoProntoPago: 50,
      valorDescuentoProntoPago: data.totalPagar / 2,
      valorAPagarConDescuento: data.totalPagar / 2,
      valorAPagarSinDescuento: data.totalPagar,
      fechaLimiteDescuento: data.fechaProntoPago,
      fechaLimitePago: '',
      moneda: 'COP',
    });

    if (mapped.comparendoId) {
      this.crearObjecionService.validarObjecion(mapped.comparendoId).subscribe({
        next: (res: { success?: boolean; msg?: string; diasHabiles?: number; maxDiasObjecion?: number; fechaComparendo?: string }) => {
          this.puedeObjetar.set(!!res.success);
          this.objecionValidacion.set({
            success: !!res.success,
            msg: res.msg ?? undefined,
            diasHabiles: res.diasHabiles ?? undefined,
            maxDiasObjecion: res.maxDiasObjecion ?? undefined,
            fechaComparendo: res.fechaComparendo ?? undefined,
          });
        },
        error: () => {
          this.puedeObjetar.set(false);
        },
      });
    }

    if (mapped.pedagogiaId && !this.programacion?.nombrePedagogia) {
      this.cargarInfoPedagogia(data.expediente);
    }

    this.cargando.set(false);
  }

  private cargarInfoPedagogia(numeroComparendo: string): void {
    if (!this.identificacionParam) return;
    const current = this.comparendo();
    const idProg = current?.pedagogia?.idprogramacionpedagogia;

    this.pedagogiaService
      .getProgramacionPedagogia(numeroComparendo, this.identificacionParam)
      .subscribe({
        next: (resp) => {
          const cursos: ProgramacionPedagogia[] = Array.isArray(resp.data) ? resp.data : [];
          this.infoPedagogia.set(
            idProg
              ? (cursos.find((c) => c.idProgramacionPedagogia === idProg) ?? cursos[0] ?? null)
              : (cursos[0] ?? null),
          );
        },
        error: () => {
          this.infoPedagogia.set(null);
        },
      });
  }

  toDate(fecha: string | null): Date | null {
    if (!fecha) return null;
    const normalized = fecha.includes('T')
      ? fecha
      : fecha.includes(' ')
        ? fecha.replace(' ', 'T')
        : fecha + 'T12:00:00';
    const d = new Date(normalized);
    return isNaN(d.getTime()) ? null : d;
  }

  get tieneFechaPago(): boolean {
    return !!this.comparendo()?.fechaPago;
  }

  get puedePagar(): boolean {
    const c = this.comparendo();
    return c ? (c.estado || '').toLowerCase() !== 'pagado' : false;
  }

  get tieneMedidaEconomica(): boolean {
    return this.comparendo()?.medidasCorrectivas?.some((m) => !!m.esEconomica) ?? false;
  }

  get medidasCorrectivasOrdenadas(): MedidaCorrectiva[] {
    return this.comparendo()?.medidasCorrectivas ?? [];
  }

  private ordenarMedidasCorrectivas(medidas: MedidaCorrectiva[]): MedidaCorrectiva[] {
    return medidas
      .map((medida, index) => ({ medida, index }))
      .sort((a, b) => {
        const prioridadA = this.prioridadMedida(a.medida);
        const prioridadB = this.prioridadMedida(b.medida);
        if (prioridadA !== prioridadB) {
          return prioridadA - prioridadB;
        }
        return a.index - b.index;
      })
      .map(({ medida }) => medida);
  }

  private prioridadMedida(medida: MedidaCorrectiva): number {
    const nombre = (medida.nombre ?? '').trim();
    if (nombre === MEDIDA_PEDAGOGIA_PARTICIPACION) {
      return 0;
    }
    if (this.esMedidaMulta(medida)) {
      return 1;
    }
    return 2;
  }

  private esMedidaMulta(medida: MedidaCorrectiva): boolean {
    if (medida.esEconomica) {
      return true;
    }
    const nombre = (medida.nombre ?? '').trim().toLowerCase();
    return nombre.startsWith('multa');
  }

  descripcionMedida(medida: MedidaCorrectiva): string | null {
    const nombre = (medida.nombre ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\u0300-\u036f/g, '');
    if (nombre === 'destruccion de bien') {
      return DESCRIPCION_DESTRUCCION_DE_BIEN;
    }
    if (nombre === 'amonestacion') {
      return DESCRIPCION_AMONESTACION;
    }
    return null;
  }

  esPrimeraMedidaEconomica(medida: MedidaCorrectiva): boolean {
    const medidas = this.medidasCorrectivasOrdenadas;
    const primera = medidas.find((m) => m.esEconomica);
    return primera === medida;
  }

  medidaAplicaPedagogia(medida: MedidaCorrectiva): boolean {
    return (
      !!medida.conmutablePorPedagogia ||
      (medida.nombre ?? '').trim() === MEDIDA_PEDAGOGIA_PARTICIPACION
    );
  }

  esPrimeraMedidaConPedagogia(medida: MedidaCorrectiva): boolean {
    const medidas = this.medidasCorrectivasOrdenadas;
    const primera = medidas.find((m) => this.medidaAplicaPedagogia(m));
    return primera === medida;
  }

  get aplicaDescuentoProntoPago(): boolean {
    const pago = this.infoPago();
    if (!pago?.fechaLimiteDescuento) return false;
    const limite = new Date(pago.fechaLimiteDescuento + 'T23:59:59');
    return this.puedePagar && new Date() <= limite;
  }

  get puedeConmutar(): boolean {
    return this.comparendo()?.conmutar === '1';
  }

  get puedeInscribirsePedagogia(): boolean {
    const c = this.comparendo();
    if (!c) return false;
    if (c.pedagogiaId !== null) return false;
    const conmutaActivo =
      c.conmutar === '1' && (c.estado || '').toLowerCase() === 'activo';
    const tienePedagogia = c.tienePedagogia === 1;
    return conmutaActivo || tienePedagogia;
  }

  get programacion(): ProgramacionDetalle | ProgramacionPedagogia | null {
    return (
      this.infoPedagogia() ??
      this.comparendo()?.pedagogia?.programacion_pedagogia ??
      null
    );
  }

  get etiquetaPedagogiaEstado(): string {
    switch (this.comparendo()?.pedagogiaEstado) {
      case 1:
        return 'Inscrito';
      case 3:
        return 'Asistió';
      default:
        return 'Pendiente';
    }
  }

  get clasePedagogiaEstado(): string {
    switch (this.comparendo()?.pedagogiaEstado) {
      case 1:
        return 'bg-primary';
      case 3:
        return 'bg-success';
      default:
        return 'bg-secondary';
    }
  }

  formatHora(hora: string | undefined): string {
    if (!hora) return '';
    return hora.slice(0, 5);
  }

  get recomendacion(): { texto: string; destacado: string; color: string } {
    const c = this.comparendo();
    if (!c) return { texto: '', destacado: '', color: '' };

    const estado = (c.estado || '').toLowerCase();
    const pedagogiaEstado = c.pedagogiaEstado;

    if (estado === 'pagado') {
      return {
        texto: 'Su comparendo ya está pagado. No se requiere ninguna acción adicional.',
        destacado: 'Pagado',
        color: 'text-success',
      };
    }

    if (pedagogiaEstado === 3) {
      return {
        texto: 'Usted ya completó la jornada de pedagogía.',
        destacado: 'Pedagogía realizada',
        color: 'text-success',
      };
    }

    if (pedagogiaEstado === 1) {
      return {
        texto:
          'Ya tiene una inscripción activa a pedagogía. Asista a la jornada en la fecha y hora indicadas para extinguir la deuda.',
        destacado: 'Inscripción activa a pedagogía',
        color: 'text-primary',
      };
    }

    if (this.aplicaDescuentoProntoPago) {
      const pct = this.infoPago()?.porcentajeDescuentoProntoPago ?? 0;
      return {
        texto: `Tiene disponible un descuento del ${pct}% por pronto pago. Le recomendamos realizar el pago antes de que venza el plazo.`,
        destacado: `${pct}% de descuento disponible`,
        color: 'text-success',
      };
    }

    if (this.puedeInscribirsePedagogia) {
      return {
        texto:
          'Puede inscribirse a una jornada de pedagogía para extinguir la deuda si aún cumple los requisitos.',
        destacado: 'Inscripción a pedagogía disponible',
        color: 'text-primary',
      };
    }

    return {
      texto:
        'El plazo de descuento por pronto pago ha vencido. Puede realizar el pago por el valor total o consultar otras opciones.',
      destacado: 'Descuento vencido',
      color: 'text-danger',
    };
  }

  get estadoBadgeClase(): string {
    switch ((this.comparendo()?.estado ?? '').toLowerCase()) {
      case 'vencido':
        return 'bg-danger';
      case 'pagado':
        return 'bg-success';
      case 'activo':
        return 'bg-primary';
      case 'pendiente':
        return 'bg-warning text-dark';
      default:
        return 'bg-secondary';
    }
  }

  volver(): void {
    this.router.navigate(rutasCodigoPolicia(this.router, undefined, this.ctxNavegacion()));
  }

  irAlInicio(): void {
    this.router.navigate(rutasCodigoPolicia(this.router, undefined, this.ctxNavegacion()));
  }

  pagarMulta(): void {
    console.log('Pagar multa del comparendo:', this.comparendo()?.expediente);
  }

  generarRecibo(): void {
    const c = this.comparendo();
    if (!c) return;
    const idComparendo = c.comparendoId;
    const numeroIdentificacion = this.identificacionParam ?? c.identificacion;
    if (!numeroIdentificacion) {
      alert('No se encontró el número de identificación para generar el recibo.');
      return;
    }

    this.crearReciboService.crearReciboPago(idComparendo, numeroIdentificacion).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recibo-pago-${idComparendo}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err: unknown) => {
        const httpErr = err as { status?: number; error?: Blob };
        if (httpErr?.error instanceof Blob) {
          httpErr.error.text().then((msg) => {
            alert(`No se pudo generar el recibo de pago (${httpErr.status}): ${msg}`);
          });
        } else {
          const status = httpErr?.status;
          const mensaje =
            status === 404
              ? 'El recibo de pago no fue encontrado.'
              : `Ocurrió un error al generar el recibo de pago (código ${status ?? 'desconocido'}).`;
          alert(mensaje);
        }
      },
    });
  }

  conmutarComparendo(): void {
    console.log('Iniciar conmutación del comparendo:', this.comparendo()?.expediente);
  }

  inscribirsePedagogia(): void {
    const c = this.comparendo();
    if (c) {
      this.busquedaState.expediente = c.expediente || c.numeroFormato;
      this.router.navigate(rutasCodigoPolicia(this.router, 'lista-pedagogia', this.ctxNavegacion()));
    }
  }

  descargarCertificadoPedagogia(): void {
    const id = this.comparendo()?.pedagogiaId;
    if (!id) return;
    this.pedagogiaService.certificadoInscripcionPedagogia(id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificado-pedagogia-${id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error al descargar certificado', err);
      },
    });
  }

  descargarCertificadoAsistencia(): void {
    const id = this.comparendo()?.pedagogiaId;
    if (!id) return;
    this.pedagogiaService.certificadoAsistenciaPedagogia(id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificado-asistencia-${id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error al descargar certificado de asistencia', err);
      },
    });
  }

  descargarCertificadoObjecion(): void {
    const id = this.comparendo()?.objecionId;
    if (!id) return;
    this.crearObjecionService.descargarCertificado(id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificado-objecion-${id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error al descargar certificado de objeción', err);
      },
    });
  }

  abrirModalObjecion(): void {
    this.aceptaAdvertencia = false;
    this.pasoModalObjecion = 1;
    this.mostrarModalObjecion = true;
  }

  cerrarModalObjecion(): void {
    this.mostrarModalObjecion = false;
    this.aceptaAdvertencia = false;
  }

  avanzarConfirmacion(): void {
    if (this.aceptaAdvertencia) this.pasoModalObjecion = 2;
  }

  confirmarObjecion(): void {
    this.cerrarModalObjecion();
    this.objetarComparendo();
  }

  objetarComparendo(): void {
    if (this.comparendo()) {
      this.router.navigate(rutasCodigoPolicia(this.router, 'crea-objecion', this.ctxNavegacion()));
    }
  }

  solicitarConmutacion(): void {
    console.log('Solicitar conmutación:', this.comparendo()?.expediente);
  }
}
