import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BusquedaStateService } from 'src/app/core/services/busqueda-state.service';
import {
  PedagogiaInscripcion,
  PedagogiaService,
  ProgramacionDetalle,
} from 'src/app/core/services/pedagogia.service';

@Component({
  selector: 'app-gestion-pedagogia',
  imports: [CommonModule],
  templateUrl: './gestion-pedagogia.component.html',
  styleUrls: ['./gestion-pedagogia.component.sass'],
})
export class GestionPedagogiaComponent {
  readonly descripcionMedidaPedagogica =
    'Medida correctiva de carácter pedagógico y restaurativo, mediante el cual el presunto infractor participa en un programa comunitario o en una actividad pedagógica, con el fin de reflexionar sobre las consecuencias de su conducta y reforzar el respeto por las normas de convivencia.';
  private pedagogiaService = inject(PedagogiaService);
  private router = inject(Router);
  private busquedaState = inject(BusquedaStateService);

  @Input() conmutablePorPedagogia = false;
  @Input() mostrarPedagogia = false;
  @Input() expediente = '';
  @Input() pedagogiaId: number | null = null;
  @Input() pedagogiaEstado: number | null = null;
  @Input() puedeInscribirsePedagogia = false;
  @Input() nombrePedagogia = '';
  @Input() descripcionPedagogia = '';
  @Input() pedagogia: PedagogiaInscripcion | null = null;

  get programacion(): ProgramacionDetalle | null {
    return this.pedagogia?.programacion_pedagogia ?? null;
  }

  get mostrarSeccionPedagogia(): boolean {
    return !!(this.pedagogiaId || this.puedeInscribirsePedagogia);
  }

  get etiquetaPedagogiaEstado(): string {
    switch (this.pedagogiaEstado) {
      case 1:
        return 'Inscrito';
      case 3:
        return 'Asistió';
      default:
        return 'Pendiente';
    }
  }

  get clasePedagogiaEstado(): string {
    switch (this.pedagogiaEstado) {
      case 1:
        return 'bg-warning';
      case 3:
        return 'bg-success';
      default:
        return 'bg-secondary';
    }
  }

  fechaPrograma(fecha: string | null | undefined): Date | null {
    if (!fecha) return null;
    const dia = fecha.slice(0, 10);
    const d = new Date(dia + 'T12:00:00');
    return isNaN(d.getTime()) ? null : d;
  }

  horaPrograma(hora: string | null | undefined): string {
    return hora ? hora.slice(0, 5) : '';
  }

  etiquetaModalidad(modalidad: string | null | undefined): string {
    if (!modalidad) return '';
    return modalidad.charAt(0).toUpperCase() + modalidad.slice(1);
  }

  inscribirsePedagogia(): void {
    if (this.expediente) {
      this.busquedaState.expediente = this.expediente;
      this.router.navigate(['/gestion-acceso-justicia/comparendo/gestion-ciudadano/lista-pedagogia']);
    }
  }

  descargarCertificadoPedagogia(): void {
    if (!this.pedagogiaId) return;
    this.pedagogiaService.certificadoInscripcionPedagogia(this.pedagogiaId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificado-pedagogia-${this.pedagogiaId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error al descargar certificado', err);
      },
    });
  }

  descargarCertificadoAsistencia(): void {
    if (!this.pedagogiaId) return;
    this.pedagogiaService.certificadoAsistenciaPedagogia(this.pedagogiaId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificado-asistencia-${this.pedagogiaId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error al descargar certificado de asistencia', err);
      },
    });
  }
}
