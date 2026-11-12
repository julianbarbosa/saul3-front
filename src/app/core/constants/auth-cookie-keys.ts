export const AUTH_COOKIE_KEY = 'ssj-auth';
export const AUTH_TOKEN_COOKIE_KEY = `${AUTH_COOKIE_KEY}-token`;
export const AUTH_TOKEN_TYPE_COOKIE_KEY = `${AUTH_COOKIE_KEY}-token-type`;
export const AUTH_REFRESH_COOKIE_KEY = `${AUTH_COOKIE_KEY}-refresh`;
export const AUTH_TOKEN_EXPIRES_COOKIE_KEY = `${AUTH_COOKIE_KEY}-token-expires`;
export const AUTH_REFRESH_EXPIRES_COOKIE_KEY = `${AUTH_COOKIE_KEY}-refresh-expires`;

/** Respaldo si la API no envía token_expires_at. */
export const ACCESS_TOKEN_TTL_MS = 20_000;

/** Segundos antes de `token_expires_at` en los que se considera vencido (refresh). Debe ser < vida del access en backend. */
export const MARGEN_RENOVACION_ACCESS_SEG = 5;

/** Margen opcional sobre `refresh_token_expires_at` (backend ~60 s). Para corte de sesión usar margen 0. */
export const MARGEN_RENOVACION_REFRESH_SEG = 30;
