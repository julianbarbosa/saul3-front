export const AUTH_COOKIE_KEY = 'ssj-auth';
export const AUTH_TOKEN_COOKIE_KEY = `${AUTH_COOKIE_KEY}-token`;
export const AUTH_TOKEN_TYPE_COOKIE_KEY = `${AUTH_COOKIE_KEY}-token-type`;
export const AUTH_REFRESH_COOKIE_KEY = `${AUTH_COOKIE_KEY}-refresh`;
export const AUTH_TOKEN_EXPIRES_COOKIE_KEY = `${AUTH_COOKIE_KEY}-token-expires`;
export const AUTH_REFRESH_EXPIRES_COOKIE_KEY = `${AUTH_COOKIE_KEY}-refresh-expires`;

/** Respaldo si la API no envía token_expires_at. */
export const ACCESS_TOKEN_TTL_MS = 20_000;
