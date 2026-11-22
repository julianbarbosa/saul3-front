export const AUTH_COOKIE_KEY = 'ssj-auth';

/** Roles (lista larga) en sessionStorage cuando no caben en cookie. */
export const AUTH_ROLES_SESSION_KEY = 'auth-roles';

/** Clave anterior; solo se limpia al cerrar sesión. */
export const AUTH_ROLES_SESSION_KEY_LEGACY = 'ssj-auth-roles';

/** Mensaje único para mostrar en login tras cierre por inactividad o sesión expirada. */
export const AUTH_MENSAJE_CIERRE_SESSION_KEY = 'auth-mensaje-cierre-sesion';

export const MENSAJE_SESION_CERRADA_INACTIVIDAD =
  'Su sesión se cerró por inactividad. Inicie sesión nuevamente.';
export const AUTH_TOKEN_COOKIE_KEY = `${AUTH_COOKIE_KEY}-token`;
export const AUTH_TOKEN_TYPE_COOKIE_KEY = `${AUTH_COOKIE_KEY}-token-type`;
export const AUTH_REFRESH_COOKIE_KEY = `${AUTH_COOKIE_KEY}-refresh`;
export const AUTH_TOKEN_EXPIRES_COOKIE_KEY = `${AUTH_COOKIE_KEY}-token-expires`;
export const AUTH_REFRESH_EXPIRES_COOKIE_KEY = `${AUTH_COOKIE_KEY}-refresh-expires`;

/** Respaldo si la API no envía `token_expires_in` (SESSION_LIFETIME en segundos). */
export const ACCESS_TOKEN_TTL_MS = 120_000;

/** Respaldo refresh (SESSION_REDIRECT_LIFETIME en segundos). */
export const REFRESH_TOKEN_TTL_MS = 12_000_000;

/** Renovar access cuando falten ≤ N s según `token_expires_in` guardado al login/refresh (< TTL access). */
export const MARGEN_RENOVACION_ACCESS_SEG = 5;

/** Margen sobre refresh; debe ser < `refresh_token_expires_in` (p. ej. 60 s). Usar 0 para cortar solo al vencer. */
export const MARGEN_RENOVACION_REFRESH_SEG = 5;
