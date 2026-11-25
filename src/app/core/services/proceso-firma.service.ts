import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ProcesoFirmaListadoItem {
  id: number;
  usuario_firmante_id: number;
  estado: string | null;
  estado_codigo: string | null;
  codigo_proceso: string | null;
  codigo_transaccion: string | null;
  codigo_respuesta: string | null;
  peso_total_bytes: string;
  url_firma: string | null;
  numero_archivos: number;
  observaciones: string | null;
  created_at: string | null;
}

interface ProcesoFirmaListarResponse {
  success: boolean;
  message?: string;
  total?: number;
  data?: ProcesoFirmaListadoItem[];
}

@Injectable({ providedIn: 'root' })
export class ProcesoFirmaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.SAUL3_API_URL.replace(/\/$/, '');

  /** GET /proceso_firma/listar — bandeja del usuario firmante (GOCE-204). */
  listarProcesosFirma(): Observable<ProcesoFirmaListadoItem[]> {
    return this.http.get<ProcesoFirmaListarResponse>(`${this.baseUrl}/proceso_firma/listar`).pipe(
      map((response) => (response?.success && Array.isArray(response.data) ? response.data : [])),
    );
  }
}