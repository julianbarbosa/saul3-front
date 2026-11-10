import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BusquedaStateService {
  identificacion: string | null = null;
  tipo: string | undefined = undefined;
  comparendoId: number | null = null;
  objecionId: number | null = null;
  fechaObjecion: string | null = null;
  expediente: string | null = null;
  /** true cuando el ciudadano entró por /codigopolicia (sin sesión SAUL). */
  accesoPublicoCodigoPolicia = false;
  /** Última lista de comparendos consultada (restaura al volver desde detalle). */
  comparendosConsulta: Record<string, unknown>[] | null = null;
}
