import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ComparendoExpedienteBusqueda,
  ExpedienteFisicoRespuesta,
  ExpedienteGestion,
  ExpedienteListadoItem,
  ExpedienteListadoRespuesta,
  InspeccionItem,
  MovimientoExpediente,
  PagoComparendoRespuesta,
  PermisosUsuarioSaul2,
  RegistrarMovimientoPayload,
  ResponsableExpediente,
  RespuestaSaul2,
} from '../interfaces/control-sanciones-expediente.interface';

@Injectable({ providedIn: 'root' })
export class ControlSancionesExpedienteService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.SAUL3_API_URL.replace(/\/$/, '');
  /** Descargas/documentos aún en SAUL2 hasta migrar. */
  private readonly baseLegacy = environment.SAUL2_API_URL.replace(/\/$/, '');

  /**
   * @deprecated Use `PermisosService.cargar()` (`GET /usuario/permisos`).
   * Mantenido por compatibilidad con scripts y tests legacy.
   */
  obtenerPermisosUsuario(): Observable<PermisosUsuarioSaul2> {
    return this.http.get<PermisosUsuarioSaul2>(`${this.base}/usuario/permisos`);
  }

  /** 2 — por número de comparendo o expediente (p. ej. 76-001-6-2026-212456). */
  buscarComparendo(numeroFormato: string): Observable<ComparendoExpedienteBusqueda> {
    return this.http.get<ComparendoExpedienteBusqueda>(
      `${this.base}/controlsanciones/comparendo/get/${encodeURIComponent(numeroFormato)}`,
    );
  }

  /** 2b — desde listado múltiple (id comparendoxexpediente). */
  buscarComparendoPorIdExpedienteInterno(idExpediente: number): Observable<ComparendoExpedienteBusqueda> {
    return this.http.get<ComparendoExpedienteBusqueda>(
      `${this.base}/controlsanciones/expediente/interno/${idExpediente}/comparendo`,
    );
  }

  /** 3 */
  obtenerExpedientePorComparendo(idComparendo: number): Observable<ExpedienteGestion | null> {
    return this.http
      .get<ExpedienteGestion | { success?: boolean; msg?: string }>(
        `${this.base}/comparendo/expediente/get/${idComparendo}`,
      )
      .pipe(
        map((res) => {
          if (!res || typeof res !== 'object' || Array.isArray(res)) {
            return null;
          }
          if ('success' in res && res.success !== true) {
            return null;
          }
          const exp = res as ExpedienteGestion;
          return exp.id ? exp : null;
        }),
      );
  }

  /** 4 */
  listarResponsables(): Observable<ResponsableExpediente[]> {
    return this.http.get<ResponsableExpediente[]>(`${this.base}/controlsanciones/responsables`);
  }

  /** 5 */
  historialMovimientos(idComparendo: number): Observable<MovimientoExpediente[]> {
    return this.http.get<MovimientoExpediente[]>(
      `${this.base}/controlsanciones/movimientocomparendo/${idComparendo}`,
    );
  }

  /** 6 */
  consultarPago(idComparendo: number): Observable<PagoComparendoRespuesta> {
    return this.http.get<PagoComparendoRespuesta>(
      `${this.base}/comparendo/pago/get/${idComparendo}`,
    );
  }

  /** 7 */
  consultarExpedienteFisico(idComparendo: number): Observable<ExpedienteFisicoRespuesta> {
    return this.http.get<ExpedienteFisicoRespuesta>(
      `${this.base}/comparendo/consultarexpedientefisico/${idComparendo}`,
    );
  }

  /** 8 */
  registrarMovimiento(payload: RegistrarMovimientoPayload): Observable<RespuestaSaul2> {
    return this.http.post<RespuestaSaul2>(
      `${this.base}/controlsanciones/registrarmovimiento`,
      payload,
    );
  }

  /** 9 */
  listarExpedientesPorEstado(estado: string, inspeccion?: string | number): Observable<ExpedienteListadoItem[]> {
    let url = `${this.base}/controlsanciones/expediente/get?estado=${encodeURIComponent(estado)}`;
    if (inspeccion !== undefined && inspeccion !== '' && inspeccion !== null) {
      url += `&inspeccion=${encodeURIComponent(String(inspeccion))}`;
    }
    return this.http
      .get<ExpedienteListadoRespuesta>(url)
      .pipe(map((res) => (Array.isArray(res.data) ? res.data : [])));
  }

  /** 10 */
  registrarMovimientoMultiple(payload: RegistrarMovimientoPayload): Observable<RespuestaSaul2> {
    return this.http.post<RespuestaSaul2>(
      `${this.base}/controlsanciones/registrarmovimientomultiple`,
      payload,
    );
  }

  /** 11 */
  listarInspecciones(): Observable<InspeccionItem[]> {
    return this.http
      .get<{ success?: boolean; data?: InspeccionItem[] }>(`${this.base}/controlpolicivo/inspector/getall`)
      .pipe(map((res) => res.data ?? []));
  }

  urlDescargaExpedienteAuto(idComparendoXExpedienteAuto: number): string {
    return `${this.baseLegacy}/controlpolicivo/primerainstancia/descargarexpediente/${idComparendoXExpedienteAuto}`;
  }

  urlComprobantePago(idComparendo: number): string {
    return `${this.baseLegacy}/controlsanciones/comprobantepago/${idComparendo}`;
  }

  urlCertificadoPedagogia(idComparendoXProgramacionPedagogia: number): string {
    return `${this.baseLegacy}/controlpolicivo/certificadoasistencia/${idComparendoXProgramacionPedagogia}`;
  }

  urlGenerarDocumento(codigoDocumento: string, idsExpediente: number[]): string {
    const data = idsExpediente.join(',');
    return `${this.baseLegacy}/controlsanciones/generardocumento?codigoDocumento=${encodeURIComponent(codigoDocumento)}&data=${encodeURIComponent(data)}`;
  }

  urlGenerarDevolucionCsv(estado: string, inspeccion: string | number): string {
    return `${this.baseLegacy}/controlsanciones/generardevolucioncsv/${encodeURIComponent(estado)}/${encodeURIComponent(String(inspeccion))}`;
  }

  urlGenerarDevolucion(inspeccion: string | number): string {
    return `${this.baseLegacy}/controlsanciones/generardevolucion/${encodeURIComponent(String(inspeccion))}`;
  }

  urlGenerarEnvioCerradoPorPago(inspeccion: string | number): string {
    return `${this.baseLegacy}/controlsanciones/generarenviocerradoporpago/${encodeURIComponent(String(inspeccion))}`;
  }

  urlGenerarFuid(estado: string, idInspeccion: string | number): string {
    return `${this.baseLegacy}/controlsanciones/generarfuid/${encodeURIComponent(estado)}/${encodeURIComponent(String(idInspeccion))}`;
  }

  urlGenerarBase(): string {
    return `${this.baseLegacy}/controlsanciones/generarbase`;
  }
}