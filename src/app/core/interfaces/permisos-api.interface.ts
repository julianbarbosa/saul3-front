/** Respuesta de GET /usuario/permisos (fuente de permisos para UX en front). */
export interface PermisosUsuarioResponse {
  success: boolean;
  msg?: string;
  id?: number;
  username?: string | null;
  permisos?: string[];
}