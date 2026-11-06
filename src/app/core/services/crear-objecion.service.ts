import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ResponseI } from '../interfaces/response.interface';

export interface GuardarObjecionPayload {
  idComparendo: number;
  argumentos: string;
  telefono: string;
  email: string;
  direccionnotifica: string;
}

@Injectable({ providedIn: 'root' })
export class CrearObjecionService {
  private http = inject(HttpClient);

  guardarObjecion(payload: GuardarObjecionPayload, archivos: File[] = []): Observable<ResponseI> {
    const formData = new FormData();
    formData.append('idComparendo', String(payload.idComparendo));
    formData.append('argumentos', payload.argumentos);
    formData.append('telefono', payload.telefono);
    formData.append('email', payload.email);
    formData.append('direccionnotifica', payload.direccionnotifica);
    archivos.forEach((file, i) => formData.append(`archivos[${i}]`, file, file.name));

    return this.http.post<ResponseI>(`${environment.SAUL3_API_URL}/comparendo/guardarobjecion`, formData);
  }

  validarObjecion(idComparendo: number): Observable<ResponseI> {
    return this.http.get<ResponseI>(`${environment.SAUL3_API_URL}/comparendo/validarobjecion/${idComparendo}`);
  }

  validaInspeccion(idComparendo: number): Observable<ResponseI> {
    return this.http.get<ResponseI>(`${environment.SAUL3_API_URL}/comparendo/validainspeccion/${idComparendo}`);
  }

  descargarCertificado(idObjecion: number): Observable<Blob> {
    return this.http.get(`${environment.SAUL3_API_URL}/comparendo/certificadoobjecion/${idObjecion}`, {
      responseType: 'blob',
    });
  }
}
