import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CrearReciboPagoService {
  private http = inject(HttpClient);

  crearReciboPago(idComparendo: number, numeroIdentificacion: string): Observable<Blob> {
    return this.http.get(
      `${environment.SAUL3_API_URL}/comparendo/crearrecibosidcomparendo/${idComparendo}/${numeroIdentificacion}`,
      { responseType: 'blob' },
    );
  }
}
