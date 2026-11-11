/** Límite práctico por cookie (~4 KB en navegadores). */
const COOKIE_SIZE_LIMIT = 3800;

const AUTH_COOKIE_MAX_AGE_SEC = 8 * 60 * 60;

function escapeCookieName(name: string): string {
  return name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function setAuthCookie(name: string, value: string): void {
  const encoded = encodeURIComponent(value);
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encoded}; path=/; max-age=${AUTH_COOKIE_MAX_AGE_SEC}; SameSite=Lax${secure}`;
}

export function getAuthCookie(name: string): string | null {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${escapeCookieName(name)}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

export function deleteAuthCookie(name: string): void {
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax${secure}`;
}

export function cookieFits(value: string): boolean {
  return encodeURIComponent(value).length <= COOKIE_SIZE_LIMIT;
}
