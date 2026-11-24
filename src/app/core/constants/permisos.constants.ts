import { environment } from '../../../environments/environment';

/** Ruta relativa bajo SAUL3 API. */
export const PERMISOS_API_PATH = '/usuario/permisos';

export const PERMISOS_API_URL = `${environment.SAUL3_API_URL.replace(/\/$/, '')}${PERMISOS_API_PATH}`;