import { Component, OnInit, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { PedagogiaService } from 'src/app/core/services/pedagogia.service';
import { CrearReciboPagoService } from 'src/app/core/services/crear-recibo.service';
import { CrearObjecionService } from 'src/app/core/services/crear-objecion.service';
import { ComparendoService } from 'src/app/core/services/comparendo.service';
import { BusquedaStateService } from 'src/app/core/services/busqueda-state.service';
import {
  marcarAccesoPublicoCodigoPolicia,
  rutasCodigoPolicia,
  RutasCodigoPoliciaCtx,
} from 'src/app/core/helpers/codigo-policia-route.helper';
import { DetalleComparendoComponent } from '../detalle-comparendo/detalle-comparendo.component';
interface Comparendo {
  comparendoId: string | number;
  expediente: string;
  numeroFormato?: string;
  fechaComparendo: string;
  descripcion?: string;
  comportamientocontrario?: string;
}

@Component({
  selector: 'app-lista-comparendos',
  imports: [CommonModule, FormsModule, NgbPaginationModule, DetalleComparendoComponent],
  templateUrl: './lista-comparendos.component.html',
  styleUrls: ['./lista-comparendos.component.sass']
})
export class ListaComparendosComponent implements OnInit {

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private comparendoService = inject(ComparendoService);
  private busquedaState = inject(BusquedaStateService);
  private pedagogiaService = inject(PedagogiaService);
  private crearReciboService = inject(CrearReciboPagoService);
  private crearObjecionService = inject(CrearObjecionService);
  /** Cuando true (p. ej. embebido en main), oculta cabecera duplicada. */
  @Input() embebido = false;

  @Input()
  set comparendos(value: Comparendo[] | null | undefined) {
    const list = Array.isArray(value) ? value : [];
    this.asignarComparendos(
      list.map((item) =>
        this.mapearComparendo(item as unknown as Record<string, unknown>),
      ),
    );
  }
  get comparendos(): Comparendo[] {
    return this._comparendos;
  }
  private _comparendos: Comparendo[] = [];

  @Input() identificacion: string | null = null;
  identificacionParam: string | null = null;
  cargando: boolean = false;
  errorAlCargar: boolean = false;

  mostrarModalDetalle = false;
  mostrarModalObjecion: boolean = false;
  pasoModalObjecion: 1 | 2 = 1;
  aceptaAdvertencia: boolean = false;
  comparendoParaObjetar: Comparendo | null = null;

  page = 1;
  readonly pageSize = 5;
  filtro = '';
  expandidos = new Set<string | number>();
  readonly LIMITE_TEXTO = 90;

  toggleExpandido(id: string | number): void {
    this.expandidos.has(id) ? this.expandidos.delete(id) : this.expandidos.add(id);
  }

  /** Convierte fechas API (`YYYY-MM-DD HH:mm:ss`) para el pipe `date`. */
  toDateComparendo(valor: string | undefined): Date | null {
    if (!valor || valor === 'N/A') return null;
    const normalizada = valor.includes('T') ? valor : valor.replace(' ', 'T');
    const d = new Date(normalizada);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  textoCorto(texto: string | undefined): string {
    if (!texto) return '';
    return texto.length > this.LIMITE_TEXTO ? texto.slice(0, this.LIMITE_TEXTO).trimEnd() : texto;
  }

  necesitaExpansion(texto: string | undefined): boolean {
    return (texto?.length ?? 0) > this.LIMITE_TEXTO;
  }

  get tieneComparendos(): boolean {
    return this._comparendos.length > 0;
  }

  get comparendosFiltrados(): Comparendo[] {
    const term = this.filtro.trim().toLowerCase();
    if (!term) return this._comparendos;
    return this._comparendos.filter((c) => {
      const campos = [
        c.comparendoId,
        c.numeroFormato,
        c.expediente,
        c.fechaComparendo,
        c.descripcion,
        c.comportamientocontrario,
      ];
      return campos.some((campo) =>
        String(campo ?? '')
          .toLowerCase()
          .includes(term),
      );
    });
  }

  get comparendosPaginados(): Comparendo[] {
    const inicio = (this.page - 1) * this.pageSize;
    return this.comparendosFiltrados.slice(inicio, inicio + this.pageSize);
  }

  onFiltroChange(): void {
    this.page = 1;
  }

  private asignarComparendos(list: Comparendo[]): void {
    this._comparendos = list;
    this.filtro = '';
    this.page = 1;
    this.expandidos.clear();
  }

  private extraerListaComparendos(response: unknown): unknown[] {
    if (!response) return [];
    if (Array.isArray(response)) return response;
    const body = response as Record<string, unknown>;
    const data = body['data'] ?? body['comparendos'] ?? body['result'];
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') return [data];
    return [];
  }

  private leerCampo(item: Record<string, unknown>, ...keys: string[]): unknown {
    for (const key of keys) {
      const value = item[key];
      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }
    return undefined;
  }

  private mapearComparendo(item: Record<string, unknown>): Comparendo {
    return {
      comparendoId: String(
        this.leerCampo(
          item,
          'comparendo',
          'comparendoId',
          'id',
          'comparendo_id',
        ) ?? '',
      ),
      numeroFormato: String(
        this.leerCampo(item, 'numero_formato', 'numeroFormato', 'id') ?? 'N/A',
      ),
      expediente: String(
        this.leerCampo(
          item,
          'numeroExpediente',
          'expediente',
          'numero_formato',
          'numeroFormato',
        ) ?? 'N/A',
      ),
      fechaComparendo: String(
        this.leerCampo(item, 'fechaComparendo', 'fecha_comparendo', 'fecha') ??
          'N/A',
      ),
      descripcion:
        String(item['descripcion'] ?? item['infraccion'] ?? 'Sin descripción'),
      comportamientocontrario: String(
        item['comportamientocontrario'] ??
          item['descripcion'] ??
          item['infraccion'] ??
          'Sin descripción',
      ),
    };
  }

  /** Enlace de detalle según flujo público (/codigopolicia) o con sesión. */
  enlaceDetalleComparendo(): string[] {
    return rutasCodigoPolicia(this.router, 'detalle-comparendo', this.ctxNavegacion());
  }

  private ctxNavegacion(): RutasCodigoPoliciaCtx {
    return { route: this.route, busquedaState: this.busquedaState };
  }

  ngOnInit(): void {
    marcarAccesoPublicoCodigoPolicia(this.router, this.route, this.busquedaState);
    this.route.queryParamMap.subscribe(params => {
      // En vista embebida el padre (main) ya cargó los comparendos y los pasa por @Input.
      // Si volvemos a consultar aquí, una respuesta fallida o distinta sobrescribe la lista.
      if (this.embebido) {
        this.identificacionParam =
          this.identificacion
          ?? this.busquedaState.identificacion
          ?? params.get('identificacion');
        return;
      }

      this.identificacionParam =
        this.identificacion
        ?? this.busquedaState.identificacion
        ?? params.get('identificacion');
      const tipo =
        this.busquedaState.tipo
        ?? params.get('tipo')
        ?? undefined;

      if (this._comparendos.length === 0 && this.restaurarComparendosDesdeEstado()) {
        return;
      }

      if (this.identificacionParam && this._comparendos.length === 0) {
        this.buscarComparendos(this.identificacionParam, tipo);
      }
    });
  }

  private restaurarComparendosDesdeEstado(): boolean {
    const cache = this.busquedaState.comparendosConsulta;
    if (!this.busquedaState.identificacion || !cache?.length) {
      return false;
    }
    this.asignarComparendos(
      cache.map((item) => this.mapearComparendo(item)),
    );
    return true;
  }

  buscarComparendos(identificacion: string, tipo?: string): void {
    this.cargando = true;
    this.errorAlCargar = false;
    this.comparendoService.getComparendosPorIdentificacion(identificacion, tipo).subscribe({
      next: (response) => {
        const data = this.extraerListaComparendos(response);
        const mapeados = data.map((item) =>
          this.mapearComparendo(item as Record<string, unknown>),
        );
        this.asignarComparendos(mapeados);
        this.busquedaState.comparendosConsulta = mapeados.map((c) => ({ ...c }));

        this.page = 1;
        this.cargando = false;
      },
      error: (err: unknown) => {
        console.error('Error al consultar la API:', err);
        this.asignarComparendos([]);
        this.cargando = false;
        this.errorAlCargar = true;
      }
    });
  }

  prepararDetalle(comparendo: Comparendo): void {
    this.busquedaState.comparendoId = +comparendo.comparendoId;
    if (this._comparendos.length > 0) {
      this.busquedaState.comparendosConsulta = this._comparendos.map((c) => ({ ...c }));
    }
  }

  verMas(comparendo: Comparendo): void {
    this.prepararDetalle(comparendo);
    this.mostrarModalDetalle = true;
  }

  cerrarModalDetalle(): void {
    this.mostrarModalDetalle = false;
  }

  abrirModalObjecion(comparendo: Comparendo): void {
    this.comparendoParaObjetar = comparendo;
    this.aceptaAdvertencia = false;
    this.pasoModalObjecion = 1;
    this.mostrarModalObjecion = true;
  }

  cerrarModalObjecion(): void {
    this.mostrarModalObjecion = false;
    this.comparendoParaObjetar = null;
    this.aceptaAdvertencia = false;
  }

  avanzarConfirmacion(): void {
    if (this.aceptaAdvertencia) this.pasoModalObjecion = 2;
  }

  confirmarObjecion(): void {
    if (this.comparendoParaObjetar) this.irAObjecion(this.comparendoParaObjetar);
    this.cerrarModalObjecion();
  }

  irAObjecion(comparendo: Comparendo): void {
    this.busquedaState.comparendoId = +comparendo.comparendoId;
    this.router.navigate(rutasCodigoPolicia(this.router, 'crea-objecion', this.ctxNavegacion()));
  }

  verPedagogia(comparendo: Comparendo): void {
    this.busquedaState.comparendoId = +comparendo.comparendoId;
    this.busquedaState.expediente = comparendo.numeroFormato || comparendo.expediente;
    this.router.navigate(rutasCodigoPolicia(this.router, 'lista-pedagogia', this.ctxNavegacion()));
  }

  irAlInicio(): void {
    this.router.navigate(rutasCodigoPolicia(this.router, undefined, this.ctxNavegacion()));
  }

  getEstadoBadgeClase(estado: string): string {
    switch ((estado || '').toLowerCase()) {
      case 'vencido': return 'gov-badge-danger bg-danger text-white';
      case 'pagado': return 'gov-badge-success bg-success text-white';
      case 'activo': return 'gov-badge-primary bg-primary text-white';
      case 'pendiente': return 'gov-badge-warning bg-warning text-dark';
      default: return 'gov-badge-secondary bg-secondary text-white';
    }
  }
  // Metodo para descargar el recibo de pago
  descargarReciboPago(idComparendo: number): void {
    const numeroIdentificacion = this.identificacionParam ?? this.identificacion;
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
          httpErr.error.text().then(msg => {
            alert(`No se pudo generar el recibo de pago (${httpErr.status}): ${msg}`);
          });
        } else {
          const status = httpErr?.status;
          const mensaje = status === 404
            ? 'El recibo de pago no fue encontrado.'
            : `Ocurrió un error al generar el recibo de pago (código ${status ?? 'desconocido'}).`;
          alert(mensaje);
        }
      }
    });
  }
   // Metodo para descargar el certificado de asistencia pedagogia
  descargarCertificadoAsistencia(pedagogiaId: number): void {
    this.pedagogiaService.certificadoAsistenciaPedagogia(pedagogiaId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificado-asistencia-${pedagogiaId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err: unknown) => {
        const httpErr = err as { status?: number; error?: Blob };
        if (httpErr?.error instanceof Blob) {
          httpErr.error.text().then(msg => {
            alert(`No se pudo generar el certificado (${httpErr.status}): ${msg}`);
          });
        } else {
          const status = httpErr?.status;
          const mensaje = status === 404
            ? 'El certificado no fue encontrado.'
            : `Ocurrió un error al generar el certificado (código ${status ?? 'desconocido'}).`;
          alert(mensaje);
        }
      }
    });
  }

  descargarCertificadoObjecion(objecionId: number): void {
    this.crearObjecionService.descargarCertificado(objecionId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificado-objecion-${objecionId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err: unknown) => {
        const httpErr = err as { status?: number; error?: Blob };
        if (httpErr?.error instanceof Blob) {
          httpErr.error.text().then(msg => alert(`No se pudo generar el certificado (${httpErr.status}): ${msg}`));
        } else {
          const status = httpErr?.status;
          alert(status === 404 ? 'El certificado no fue encontrado.' : `Error al generar el certificado (código ${status ?? 'desconocido'}).`);
        }
      }
    });
  }

  // Metodo para descargar el certificado de inscripción a pedagogia
  descargarCertificado(pedagogiaId: number): void {
    this.pedagogiaService.certificadoInscripcionPedagogia(pedagogiaId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificado-pedagogia-${pedagogiaId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err: unknown) => {
        const httpErr = err as { status?: number; error?: Blob };
        if (httpErr?.error instanceof Blob) {
          httpErr.error.text().then(msg => {
            console.error(`Error ${httpErr.status} al generar certificado (id ${pedagogiaId}):`, msg);
            alert(`No se pudo generar el certificado (${httpErr.status}): ${msg}`);
          });
        } else {
          const status = httpErr?.status;
          const mensaje = status === 404
            ? 'El certificado no fue encontrado. Es posible que aún no esté disponible.'
            : `Ocurrió un error al generar el certificado (código ${status ?? 'desconocido'}).`;
          console.error(`Error al generar certificado (id ${pedagogiaId}):`, err);
          alert(mensaje);
        }
      }
    });
  }
}
