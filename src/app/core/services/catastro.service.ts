import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ResponseI } from '../interfaces/response.interface';

export interface Barrio {
  idbarrio: number;
  nombre: string;
  codigo: string;
}

@Injectable({ providedIn: 'root' })
export class CatastroService {
  private http = inject(HttpClient);

  getBarrios(): Observable<Barrio[]> {
    const data = this.http
      .get<ResponseI>(`${environment.SAUL3_API_URL}/catastro/barrio`)
      .pipe(map((r) => (r?.success && Array.isArray(r.data) ? (r.data as Barrio[]) : [])));
      console.log(data);
      return data;
  }

 
  getComunas(): Observable<any> {
    return this.http
        .get<any>(`${environment.SAUL3_API_URL}/catastro/comuna`)
        .pipe(map((r) => r.data));
  }
}
