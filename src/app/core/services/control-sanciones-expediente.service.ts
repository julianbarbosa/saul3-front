import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable, of } from 'rxjs';
import {
  esNumeroExpedienteFormatoCompleto,
  mensajeFormatoNumeroExpedienteInvalido,
} from '../../features/control-sanciones/utils/numero-expediente-formato.util';
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
  RegistrarMovimientoPayload,
  ResponsableExpediente,
  RespuestaSaul2,
} from '../interfaces/control-sanciones-expediente.interface';

@Injectable({ providedIn: 'root' })
export class ControlSancionesExpedienteService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.SAUL3_API_URL.replace(/\/$/, '');

  /** 2 — comparendo/expediente: 76-001-6-2026-… o 76-001-1-2-2026-…. */
  buscarComparendo(numeroFormato: string): Observable<ComparendoExpedienteBusqueda> {
    const numero = numeroFormato.trim();
    if (!esNumeroExpedienteFormatoCompleto(numero)) {
      return of({
        success: false,
        msg: mensajeFormatoNumeroExpedienteInvalido(),
      });
    }
    return this.http.get<ComparendoExpedienteBusqueda>(
      `${this.base}/control-sanciones/comparendo/get/${encodeURIComponent(numero)}`,
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
    return this.http.get<ResponsableExpediente[]>(`${this.base}/control-sanciones/responsables`);
  }

  /** 5 */
  historialMovimientos(idComparendo: number): Observable<MovimientoExpediente[]> {
    return this.http.get<MovimientoExpediente[]>(
      `${this.base}/control-sanciones/movimiento-comparendo/${idComparendo}`,
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
      `${this.base}/control-sanciones/consultar-expediente-fisico/${idComparendo}`,
    );
  }

  /** 8 */
  registrarMovimiento(payload: RegistrarMovimientoPayload): Observable<RespuestaSaul2> {
    return this.http.post<RespuestaSaul2>(
      `${this.base}/control-sanciones/registrar-movimiento`,
      payload,
    );
  }

  /** 9 */
  listarExpedientesPorEstado(estado: string, inspeccion?: string | number): Observable<ExpedienteListadoItem[]> {
    let url = `${this.base}/control-sanciones/expediente/get?estado=${encodeURIComponent(estado)}`;
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
      `${this.base}/control-sanciones/registrar-movimiento-multiple`,
      payload,
    );
  }

  /** 11 */
  listarInspecciones(): Observable<InspeccionItem[]> {
    return this.http
      .get<{ success?: boolean; data?: InspeccionItem[] }>(`${this.base}/control-sanciones/inspector/getall`)
      .pipe(map((res) => res.data ?? []));
  }
}