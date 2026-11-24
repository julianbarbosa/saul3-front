import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ResponseI } from '../interfaces/response.interface';
import { PedagogiaInscripcion } from './pedagogia.service';

export interface TipoDocIdentificacionApi {
  id: number;
  nombre: string;
  tipo: string;
  descripcion?: string;
  numDigitos?: number | null;
  rnmcId?: number | null;
}

interface TiposDocIdentificacionResponse {
  success: boolean;
  data: TipoDocIdentificacionApi[];
}

export interface MedidaCorrectiva {
  nombre: string;
  esEconomica?: boolean;
  conmutablePorPedagogia?: boolean;
  id?: number;
  cantidadSmdlv?: number;
  valorMedida?: number;
  idHechosMedida?: number;
  entidadRemitido?: string | null;
}

export interface Comparendo {
  comparendoId: number;
  numeroFormato: string;
  expediente: string;
  numeroExpediente: string;
  fechaComparendo: string;
  identificacion: string;
  conmutar: string;
  tienePedagogia: number;
  inspeccion: string;
  descripcion: string;
  pedagogiaId: number | null;
  pedagogiaEstado: number | null;
  pedagogia: PedagogiaInscripcion | null;
  fechaPago: string | null;
  comportamientocontrario: string;
  diasHabiles: number;
  estado: string;
  descuentoLey2197: number;
  objecionId: number | null;
  fechaObjecion: string | null;
  medidasCorrectivas: MedidaCorrectiva[];
}

export interface ComparendoDetalle {
  expediente: string;
  numeroFormato?: string;
  comparendo: number;
  fechaProntoPago: string;
  totalPagar: number;
  informacionComparendo: Omit<Comparendo, 'numeroFormato' | 'expediente' | 'numeroExpediente'>;
  medidasCorrectivas: MedidaCorrectiva[];
}

@Injectable({ providedIn: 'root' })
export class ComparendoService {
  private http = inject(HttpClient);

  getTiposDocIdentificacionRnmc(): Observable<TipoDocIdentificacionApi[]> {
    return this.http
      .get<TiposDocIdentificacionResponse>(
        `${environment.SAUL3_API_URL}/tercero/tipodocidentificacionrnmc`,
      )
      .pipe(map((response) => (response?.success && Array.isArray(response.data) ? response.data : [])));
  }

  getComparendosPorIdentificacion(identificacion: string, tipo?: string): Observable<ResponseI> {
    const url = tipo
      ? `${environment.SAUL3_API_URL}/comparendo/identificacion/${identificacion}/${tipo}`
      : `${environment.SAUL3_API_URL}/comparendo/identificacion/${identificacion}`;
    return this.http.get<ResponseI>(url);
  }

  getDetalleComparendo(comparendoId: number): Observable<ResponseI> {
    return this.http.get<ResponseI>(`${environment.SAUL3_API_URL}/comparendo/detalle/${comparendoId}`);
  }
}
