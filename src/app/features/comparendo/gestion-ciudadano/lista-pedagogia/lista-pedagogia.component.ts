import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
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
export class ListaPedagogiaComponent implements OnInit {

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private pedagogiaService = inject(PedagogiaService);
  private busquedaState = inject(BusquedaStateService);

  comparendoIdParam: string | null = null;
  comparendoIdNum: number | null = null;
  identificacionParam: string | null = null;
  yaInscrito: boolean = false;
  cargando: boolean = true;
  errorAlCargar: boolean = false;
  errorInscripcion: boolean = false;
  errorMensajeInscripcion: string = '';
  comparendo: Comparendo | null = null;

  cursos: ProgramacionPedagogia[] = [];
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

  ngOnInit(): void {
    marcarAccesoPublicoCodigoPolicia(this.router, this.route, this.busquedaState);
    this.comparendoIdParam   = this.busquedaState.expediente;
    this.comparendoIdNum     = this.busquedaState.comparendoId;
    this.identificacionParam = this.busquedaState.identificacion;

    if (this.comparendoIdParam && this.identificacionParam) {
      this.cargarPedagogias(this.comparendoIdParam, this.identificacionParam);
    } else {
      this.errorAlCargar = true;
      this.cargando = false;
    }
  }

  cargarPedagogias(numeroComparendo: string, identificacion: string): void {
    this.cargando = true;
    this.errorAlCargar = false;

    this.pedagogiaService.getProgramacionPedagogia(numeroComparendo, identificacion)
      .subscribe({
        next: (resp) => {
          this.cargando = false;
          this.cursos = Array.isArray(resp.data) ? resp.data : [];
          if (this.cursos.length === 0) {
            console.warn('Sin pedagogías disponibles para este comparendo');
          }
        },
        error: (err) => {
          this.cargando = false;
          this.errorAlCargar = true;
          console.error('Error al cargar pedagogías', err);
        }
      });
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

  volver(): void { this.location.back(); }

  irADetalle(): void {
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
    if (!id) {
      this.router.navigate(rutasCodigoPolicia(this.router, 'lista-comparendos', this.ctxNavegacion()));
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
        this.router.navigate(rutasCodigoPolicia(this.router, 'lista-comparendos', this.ctxNavegacion()));
      },
      error: (err) => {
        console.error('Error al descargar certificado', err);
        this.router.navigate(rutasCodigoPolicia(this.router, 'lista-comparendos', this.ctxNavegacion()));
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
