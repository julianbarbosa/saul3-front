import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BusquedaStateService {
  identificacion: string | null = null;
  tipo: string | undefined = undefined;
  comparendoId: number | null = null;
  objecionId: number | null = null;
  fechaObjecion: string | null = null;
  expediente: string | null = null;
}
