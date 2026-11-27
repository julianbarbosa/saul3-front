import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HTTP_SKIP_LOADING } from '../interceptors/http-loading.interceptor';
import { ResponseI } from '../interfaces/response.interface';

export interface ProgramacionPedagogia {
  idProgramacionPedagogia: number;
  idpedagogia: number;
  duracion: number;
  fecha: string;
  hora: string;
  nombrePedagogia: string;
  descripcionPedagogia: string;
  lugar: string;
  salonVirtual: string | null;
  modalidad: 'presencial' | 'virtual';
  observaciones: string | null;
  cupos_disponibles?: number;
  cupos_totales?: number;
}

export interface ProgramacionDetalle {
  id: number;
  idpedagogia: number;
  lugar: string;
  fecha: string;
  hora: string;
  duracion: number;
  modalidad: 'presencial' | 'virtual';
  observaciones: string | null;
  cupo: number;
  cupousado: number;
  cupolleno: number;
  idestado: number;
  nombrePedagogia?: string;
  descripcionPedagogia: string;
}

export interface PedagogiaInscripcion {
  id: number;
  idcomparendo: number;
  idprogramacionpedagogia: number;
  idestado: number;
  contacto: string | null;
  esconmutacion: number;
  programacion_pedagogia: ProgramacionDetalle | null;
}

export interface RegistrarAsistenciaPedagogiaPayload {
  programacionPedagogia: { id: number };
  data: Array<{ idComparendo: number; check: boolean }>;
}

export interface ComportamientoContrario {
  id: number;
  descripcion: string;
}

export interface CrearPedagogiaPayload {
  tipo: string;
  nombre: string;
  descripcion: string;
  comportamientosIds: number[];
}

export interface CapacitadorPedagogia {
  id: number;
  nombre: string;
  direccion?: string;
}

export interface CatalogoPedagogia {
  id: number;
  tipo: string;
  nombre: string;
  descripcion: string;
}

export interface FechaPedagogia {
  fecha: string;
}

export interface CrearProgramacionPedagogiaPayload {
  duracion: number;
  fechaCita: { fecha: string };
  horaCita: { hora: Date };
  pedagogia: CatalogoPedagogia;
  cupo: number;
  responsable: CapacitadorPedagogia;
  modalidad: 'presencial' | 'virtual';
  lugar: string;
  observaciones: string;
  fechaInicialISO: string;
  fechaFinalISO: string;
}

@Injectable({ providedIn: 'root' })
export class PedagogiaService {
  private http = inject(HttpClient);

  datosInicialesProgramacionPedagogia(): Observable<ResponseI> {
    return this.http.get<ResponseI>(`${environment.SAUL3_API_URL}/pedagogia/inicial`);
  }

  guardarProgramacionPedagogia(
    payload: CrearProgramacionPedagogiaPayload,
  ): Observable<ResponseI> {
    return this.http.post<ResponseI>(
      `${environment.SAUL3_API_URL}/controlpolicivo/programacionpedagogia`,
      payload,
    );
  }

  listarComportamientosContrarios(): Observable<unknown> {
    return this.http.get<unknown>(
      `${environment.SAUL3_API_URL}/controlpolicivo/comportamientocontrario`,
    );
  }

  crearPedagogia(payload: CrearPedagogiaPayload): Observable<ResponseI> {
    return this.http.post<ResponseI>(
      `${environment.SAUL3_API_URL}/controlpolicivo/pedagogia`,
      payload,
    );
  }

  listarProgramacionesPedagogia(): Observable<ResponseI> {
    return this.http.get<ResponseI>(`${environment.SAUL3_API_URL}/controlpolicivo/programacionpedagogia`);
  }

  listarAsistentesProgramacion(idProgramacion: number | string): Observable<ResponseI> {
    const id = encodeURIComponent(String(idProgramacion));
    return this.http.get<ResponseI>(
      `${environment.SAUL3_API_URL}/controlpolicivo/registrarasistenciapedagogia/${id}`,
    );
  }

  registrarAsistenciaPedagogia(
    payload: RegistrarAsistenciaPedagogiaPayload,
  ): Observable<ResponseI> {
    return this.http.post<ResponseI>(
      `${environment.SAUL3_API_URL}/controlpolicivo/asistentesprogramacionpedagogia`,
      payload,
    );
  }

  imprimirAsistenciaPedagogia(idProgramacion: number | string): Observable<Blob> {
    const id = encodeURIComponent(String(idProgramacion));
    return this.http.get(
      `${environment.SAUL3_API_URL}/programacion-pedagogia/${id}/imprimir-asistencia`,
      { responseType: 'blob' },
    );
  }

  getProgramacionPedagogia(numeroComparendo: string, identificacion: string): Observable<ResponseI> {
    const numero = encodeURIComponent(numeroComparendo.trim());
    const doc = encodeURIComponent(identificacion.trim());
    // Spinner propio en lista-pedagogia; evita CD cruzado con el overlay global (NG0100).
    return this.http.get<ResponseI>(
      `${environment.SAUL3_API_URL}/comparendo/programacionpedagogia/${numero}/${doc}`,
      { headers: { [HTTP_SKIP_LOADING]: '1' } },
    );
  }

  inscribirPedagogia(
    identificacion: string,
    idComparendo: number,
    idProgramacionPedagogia: number,
    contacto?: string,
  ): Observable<ResponseI> {
    const url = contacto
      ? `${environment.SAUL3_API_URL}/comparendo/pedagogiacomparendo/${identificacion}/${idComparendo}/${idProgramacionPedagogia}/${contacto}`
      : `${environment.SAUL3_API_URL}/comparendo/pedagogiacomparendo/${identificacion}/${idComparendo}/${idProgramacionPedagogia}`;

    return this.http.get<ResponseI>(url);
  }

  certificadoInscripcionPedagogia(id: number): Observable<Blob> {
    return this.http.get(
      `${environment.SAUL3_API_URL}/comparendo/certificadoinscripcionpedagogia/${id}`,
      { responseType: 'blob' },
    );
  }

  certificadoAsistenciaPedagogia(id: number): Observable<Blob> {
    return this.http.get(`${environment.SAUL3_API_URL}/comparendo/certificadoasistencia/${id}`, {
      responseType: 'blob',
    });
  }
}
