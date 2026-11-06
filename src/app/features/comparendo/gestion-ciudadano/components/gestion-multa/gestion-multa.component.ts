import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CrearObjecionService } from 'src/app/core/services/crear-objecion.service';
import { CrearReciboPagoService } from 'src/app/core/services/crear-recibo.service';

export interface InformacionPagoMulta {
  valorBase: number;
  porcentajeDescuentoProntoPago: number;
  valorDescuentoProntoPago: number;
  valorAPagarConDescuento: number;
  valorAPagarSinDescuento: number;
  fechaLimiteDescuento: string;
  moneda: string;
}

@Component({
  selector: 'app-gestion-multa',
  imports: [CommonModule],
  templateUrl: './gestion-multa.component.html',
  styleUrls: ['./gestion-multa.component.sass'],
})
export class GestionMultaComponent {
  private crearReciboService = inject(CrearReciboPagoService);
  private crearObjecionService = inject(CrearObjecionService);

  @Input() comparendoId!: number;
  @Input() numeroIdentificacion = '';
  @Input() estadoComparendo = '';
  @Input() fechaPago: string | null = null;
  @Input() fechaProntoPago = '';
  @Input() valorBase = 0;
  @Input() porcentajeDescuentoProntoPago = 50;

  @Input() mostrarPago = true;
  @Input() mostrarObjecion = false;
  @Input() expediente = '';
  @Input() objecionId: number | null = null;
  @Input() fechaObjecion: string | null = null;
  @Input() puedeObjetar = false;
  @Input() objecionValidacionMsg = '';

  @Output() solicitarObjecion = new EventEmitter<void>();

  get mostrarSeccionObjecion(): boolean {
    return !!(this.objecionId || this.puedeObjetar || this.objecionValidacionMsg);
  }

  get infoPago(): InformacionPagoMulta {
    const base = this.valorBase > 0 ? this.valorBase : 0;
    const pct = this.porcentajeDescuentoProntoPago;
    const descuento = Math.round(base * (pct / 100));
    return {
      valorBase: base,
      porcentajeDescuentoProntoPago: pct,
      valorDescuentoProntoPago: descuento,
      valorAPagarConDescuento: Math.max(0, base - descuento),
      valorAPagarSinDescuento: base,
      fechaLimiteDescuento: this.fechaProntoPago,
      moneda: 'COP',
    };
  }

  get tieneFechaPago(): boolean {
    return !!this.fechaPago;
  }

  get puedePagar(): boolean {
    return (this.estadoComparendo || '').toLowerCase() !== 'pagado';
  }

  get aplicaDescuentoProntoPago(): boolean {
    if (!this.infoPago.fechaLimiteDescuento) return false;
    const limite = new Date(this.infoPago.fechaLimiteDescuento + 'T23:59:59');
    return this.puedePagar && new Date() <= limite;
  }

  get valorMostrar(): number {
    return this.aplicaDescuentoProntoPago
      ? this.infoPago.valorAPagarConDescuento
      : this.infoPago.valorAPagarSinDescuento;
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

  generarRecibo(): void {
    if (!this.comparendoId) return;
    const numeroIdentificacion = this.numeroIdentificacion?.trim();
    if (!numeroIdentificacion) {
      alert('No se encontró el número de identificación para generar el recibo.');
      return;
    }
    this.crearReciboService
      .crearReciboPago(this.comparendoId, numeroIdentificacion)
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `recibo-pago-${this.comparendoId}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
        },
        error: (err: unknown) => {
          const httpErr = err as { status?: number; error?: Blob };
          if (httpErr?.error instanceof Blob) {
            httpErr.error.text().then((msg) => {
              alert(
                `No se pudo generar el recibo de pago (${httpErr.status}): ${msg}`,
              );
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

  descargarCertificadoObjecion(): void {
    if (!this.objecionId) return;
    this.crearObjecionService.descargarCertificado(this.objecionId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificado-objecion-${this.objecionId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error al descargar certificado de objeción', err);
      },
    });
  }
}
