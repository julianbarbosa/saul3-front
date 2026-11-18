import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ResponseI } from 'src/app/core/interfaces/response.interface';
import { PedagogiaService, ProgramacionPedagogia } from 'src/app/core/services/pedagogia.service';
import { BusquedaStateService } from 'src/app/core/services/busqueda-state.service';
import {
  marcarAccesoPublicoCodigoPolicia,
  rutasCodigoPolicia,
  RutasCodigoPoliciaCtx,
} from 'src/app/core/helpers/codigo-policia-route.helper';

interface Comparendo {
  comparendoId: number;
  numeroFormato: string;
  expediente: string;
  conmutar: string;
  tienePedagogia: string;
  inspeccion: string;
  descripcion: string;
  pedagogiaId: number | null;
  estado: string;
  valor: number;
  diasHabiles: number;
  fechaComparendo: any;
  fechaPago: any;
  comportamientocontrario: string;
}

@Component({
  selector: 'app-lista-pedagogia',
  imports: [CommonModule, FormsModule],
  templateUrl: './lista-pedagogia.html',
  styleUrls: ['./lista-pedagogia.component.sass']
})
export class ListaPedagogiaComponent implements OnInit, OnChanges {
  /** Cuando true, cerrar/volver emite eventos en lugar de navegar por rutas. */
  @Input() enModal = false;
  /** Número de comparendo (formato RNMC); en modal tiene prioridad sobre BusquedaStateService. */
  @Input() numeroComparendo: string | null = null;
  @Input() identificacionEntrada: string | null = null;
  @Input() comparendoIdEntrada: number | null = null;
  @Output() cerrarModal = new EventEmitter<void>();
  @Output() inscripcionCompletada = new EventEmitter<void>();

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private pedagogiaService = inject(PedagogiaService);
  private busquedaState = inject(BusquedaStateService);

  // Estado leído por el template: signals para evitar NG0100
  comparendoIdParam = signal<string | null>(null);
  comparendoIdNum: number | null = null;
  identificacionParam: string | null = null;
  yaInscrito: boolean = false;
  cargando = signal(true);
  errorAlCargar = signal(false);
  errorMensajeCarga = signal('');
  errorInscripcion: boolean = false;
  errorMensajeInscripcion: string = '';
  comparendo: Comparendo | null = null;

  cursos = signal<ProgramacionPedagogia[]>([]);
  expandidosCursos = new Set<number>();
  readonly LIMITE_DESC = 90;

  textoCorto(texto: string | undefined): string {
    if (!texto) return '';
    return texto.length > this.LIMITE_DESC ? texto.slice(0, this.LIMITE_DESC).trimEnd() : texto;
  }

  necesitaExpansion(texto: string | undefined): boolean {
    return (texto?.length ?? 0) > this.LIMITE_DESC;
  }

  toggleExpandidoCurso(id: number): void {
    this.expandidosCursos.has(id) ? this.expandidosCursos.delete(id) : this.expandidosCursos.add(id);
  }

  confirmandoInscripcion: boolean = false;
  inscripcionExitosa: boolean = false;
  cursoSeleccionado: ProgramacionPedagogia | null = null;
  pedagogiaId: string = '';
  fechaInscripcion: Date = new Date();
  contacto: string = '';
  contactoInvalido: boolean = false;
  errorMensaje: string = '';

  private ctxNavegacion(): RutasCodigoPoliciaCtx {
    return { route: this.route, busquedaState: this.busquedaState };
  }

  private consultaIniciada = false;

  ngOnInit(): void {
    marcarAccesoPublicoCodigoPolicia(this.router, this.route, this.busquedaState);
    this.inicializarConsulta();
    this.consultaIniciada = true;
  }

  ngOnChanges(changes: SimpleChanges): void {
    const claves = ['numeroComparendo', 'identificacionEntrada', 'comparendoIdEntrada'] as const;
    if (!this.consultaIniciada) {
      return;
    }
    if (!claves.some((k) => k in changes && !changes[k].firstChange)) {
      return;
    }
    this.inicializarConsulta();
  }

  private inicializarConsulta(): void {
    const numero =
      this.numeroComparendo?.trim() ||
      this.busquedaState.expediente?.trim() ||
      null;
    const identificacion =
      this.identificacionEntrada?.trim() ||
      this.busquedaState.identificacion?.trim() ||
      null;
    const comparendoId = this.comparendoIdEntrada ?? this.busquedaState.comparendoId;

    this.comparendoIdParam.set(numero);
    this.comparendoIdNum = comparendoId;
    this.identificacionParam = identificacion;

    if (numero) {
      this.busquedaState.expediente = numero;
    }
    if (identificacion) {
      this.busquedaState.identificacion = identificacion;
    }
    if (comparendoId != null) {
      this.busquedaState.comparendoId = comparendoId;
    }

    if (numero && identificacion) {
      this.cargarPedagogias(numero, identificacion);
      return;
    }

    this.cursos.set([]);
    this.errorAlCargar.set(true);
    this.errorMensajeCarga.set(
      `Faltan datos para consultar (${!numero ? 'número de comparendo' : 'identificación'}).`,
    );
    this.cargando.set(false);
  }

  cargarPedagogias(numeroComparendo: string, identificacion: string): void {
    this.cargando.set(true);
    this.errorAlCargar.set(false);
    this.errorMensajeCarga.set('');
    this.cursos.set([]);

    this.pedagogiaService.getProgramacionPedagogia(numeroComparendo, identificacion).subscribe({
      next: (resp) => {
        console.log('Respuesta API:', resp);
        console.log('Data es array:', Array.isArray(resp.data));

        const cursos = this.extraerCursos(resp);
        this.cursos.set(cursos);

        console.log('Cursos asignados:', cursos);

        if (cursos.length === 0 && !this.errorAlCargar()) {
          this.errorMensajeCarga.set(
            'No hay actividades pedagógicas disponibles para este comparendo en este momento.',
          );
        }
        this.cargando.set(false);
      },
      error: (err) => {
        this.errorAlCargar.set(true);
        this.errorMensajeCarga.set(
          err?.error?.msg ||
          err?.error?.message ||
          'No fue posible cargar las actividades pedagógicas.',
        );
        this.cargando.set(false);
        console.error('Error al cargar pedagogías', err);
      },
    });
  }

  private extraerCursos(resp: ResponseI): ProgramacionPedagogia[] {
    if (resp?.success === false) {
      this.errorAlCargar.set(true);
      this.errorMensajeCarga.set(
        resp.msg || resp.message || 'No se encontraron programaciones para este comparendo.',
      );
      return [];
    }

    const raw = resp?.data as unknown;

    if (Array.isArray(raw)) {
      return raw as ProgramacionPedagogia[];
    }

    if (raw && typeof raw === 'object') {
      const nested = (raw as { data?: unknown }).data;
      if (Array.isArray(nested)) {
        return nested as ProgramacionPedagogia[];
      }

      // Collection/objeto indexado numéricamente
      const values = Object.values(raw);
      if (values.length > 0 && values.every((v) => v && typeof v === 'object')) {
        return values as ProgramacionPedagogia[];
      }
    }

    this.errorAlCargar.set(true);
    this.errorMensajeCarga.set(
      resp?.msg || resp?.message || 'La respuesta de programaciones no tiene el formato esperado.',
    );
    return [];
  }

  inscribirCurso(curso: ProgramacionPedagogia): void {
    this.cursoSeleccionado = curso;
    this.contacto = '';
    this.errorInscripcion = false;
    this.confirmandoInscripcion = true;
  }

  soloNumeros(event: KeyboardEvent): boolean {
    return /\d/.test(event.key);
  }

  onContactoChange(value: string): void {
    this.contacto = value.replace(/\D/g, '').slice(0, 10);
    this.contactoInvalido = false;
    this.errorMensaje = '';
  }

  private validarContacto(): boolean {
    const v = this.contacto.trim();
    if (!v) {
      this.errorMensaje = 'El número de celular es obligatorio.';
      this.contactoInvalido = true;
      return false;
    }
    if (!/^3\d{9}$/.test(v)) {
      this.errorMensaje = 'Ingresa 10 dígitos comenzando con 3 (ej. 3001234567).';
      this.contactoInvalido = true;
      return false;
    }
    this.contactoInvalido = false;
    this.errorMensaje = '';
    return true;
  }

  enviarFormulario(): void {
    this.confirmarInscripcion();
  }

  confirmarInscripcion(): void {
    if (!this.validarContacto()) return;

    this.contactoInvalido = false;

    if (!this.identificacionParam || !this.comparendoIdNum) {
      this.errorInscripcion = true;
      this.errorMensajeInscripcion = 'No se pudo identificar el comparendo.';
      return;
    }

    this.errorInscripcion = false;

    this.pedagogiaService.inscribirPedagogia(
      this.identificacionParam!,
      this.comparendoIdNum!,
      this.cursoSeleccionado!.idProgramacionPedagogia,
      this.contacto.trim() || undefined
    ).subscribe({
      next: (resp) => {
        const r = resp as any;
        if (r?.success === false) {
          const msg: string = r?.msg || '';
          if (msg.toLowerCase().includes('activa')) {
            this.yaInscrito = true;
            this.confirmandoInscripcion = false;
          } else {
            this.errorInscripcion = true;
            this.errorMensajeInscripcion = msg || 'No se pudo completar la inscripción.';
          }
          return;
        }
        this.pedagogiaId = (r?.id ?? r?.data?.id)?.toString() || '';
        this.fechaInscripcion = new Date();
        this.confirmandoInscripcion = false;
        this.inscripcionExitosa = true;
        this.inscripcionCompletada.emit();
      },
      error: (err) => {
        const msg: string = err?.error?.msg || err?.error?.message || '';
        if (msg.toLowerCase().includes('ya tiene una pedagogía activa')) {
          this.yaInscrito = true;
          this.confirmandoInscripcion = false;
        } else {
          this.errorInscripcion = true;
          this.errorMensajeInscripcion = msg || `Error ${err?.status ?? ''}`;
        }
        console.error('Error al inscribir:', err);
      }
    });
  }

  cancelarConfirmacion(): void {
    this.confirmandoInscripcion = false;
    this.cursoSeleccionado = null;
    this.errorInscripcion = false;
    this.errorMensajeInscripcion = '';
    this.contactoInvalido = false;
    this.errorMensaje = '';
    this.contacto = '';
  }

  getCuposBadge(disponibles: number | undefined, totales: number | undefined): { clase: string; texto: string } {
    const d = disponibles ?? 0;
    const t = totales ?? 0;
    if (d === 0) return { clase: 'cupos-badge--rojo',    texto: 'Sin cupos' };
    const pct = t > 0 ? d / t : 1;
    if (pct <= 0.25) return { clase: 'cupos-badge--naranja', texto: `${d} cupo${d !== 1 ? 's' : ''}` };
    return               { clase: 'cupos-badge--verde',   texto: `${d} cupos` };
  }

  volver(): void {
    if (this.enModal) {
      this.cerrarModal.emit();
      return;
    }
    this.location.back();
  }

  irADetalle(): void {
    if (this.enModal) {
      this.cerrarModal.emit();
      return;
    }
    this.router.navigate(rutasCodigoPolicia(this.router, 'detalle-comparendo', this.ctxNavegacion()));
  }

  imprimirComprobante(): void {
    const id = Number(this.pedagogiaId);
    if (!id) {
      console.error('No se encontró el ID de inscripción para generar el certificado');
      return;
    }
    this.pedagogiaService.certificadoInscripcionPedagogia(id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificado-pedagogia-${id}.pdf`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
      error: (err) => {
        console.error('Error al descargar certificado', err);
      }
    });
  }

  finalizarYDescargar(): void {
    const id = Number(this.pedagogiaId);
    const salir = (): void => {
      if (this.enModal) {
        this.cerrarModal.emit();
        return;
      }
      this.router.navigate(rutasCodigoPolicia(this.router, 'lista-comparendos', this.ctxNavegacion()));
    };

    if (!id) {
      salir();
      return;
    }
    this.pedagogiaService.certificadoInscripcionPedagogia(id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificado-pedagogia-${id}.pdf`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        salir();
      },
      error: (err) => {
        console.error('Error al descargar certificado', err);
        salir();
      }
    });
  }

  descargarCertificadoAsistencia(id: number): void {
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
      }
    });
  }
}