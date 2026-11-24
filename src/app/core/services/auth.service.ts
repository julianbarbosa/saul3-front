import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, map, Observable, of, shareReplay, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  LoginResponse,
  LoginResult,
  RefreshTokenResponse,
  TokenParData,
} from '../interfaces/auth.interface';
import {
  ACCESS_TOKEN_TTL_MS,
  REFRESH_TOKEN_TTL_MS,
  AUTH_COOKIE_KEY,
  AUTH_REFRESH_COOKIE_KEY,
  AUTH_TOKEN_COOKIE_KEY,
  AUTH_REFRESH_EXPIRES_COOKIE_KEY,
  AUTH_TOKEN_EXPIRES_COOKIE_KEY,
  AUTH_TOKEN_TYPE_COOKIE_KEY,
  MARGEN_RENOVACION_ACCESS_SEG,
  MARGEN_RENOVACION_REFRESH_SEG,
  AUTH_MENSAJE_CIERRE_SESSION_KEY,
  AUTH_ROLES_SESSION_KEY,
  AUTH_ROLES_SESSION_KEY_LEGACY,
  MENSAJE_SESION_CERRADA_INACTIVIDAD,
} from '../constants/auth-cookie-keys';
import {
  deleteAuthCookie,
  getAuthCookie,
  setAuthCookie,
} from '../utils/auth-cookie.util';
import { PermisosService } from './permisos.service';

const INTERVAL_CONTROL_INACTIVIDAD_MS = 10_000;

interface RefreshTokensPayload {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  token_expires_at?: string;
  token_expires_in?: number;
  refresh_token_expires_at?: string;
  refresh_token_expires_in?: number;
}

type ExpiracionTokenPar = Pick<
  TokenParData,
  'token_expires_at' | 'token_expires_in' | 'refresh_token_expires_at' | 'refresh_token_expires_in'
>;

export interface UsuarioAuth {
  id?: number;
  username?: string;
  nombre: string;
  correo?: string;
  roles?: string[];
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly permisos = inject(PermisosService);

  private refresh$: Observable<string> | null = null;
  private controlInactividadIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (getAuthCookie(AUTH_COOKIE_KEY) === 'true') {
      this.iniciarControlInactividad();
    }
  }

  isAuthenticated(): boolean {
    if (getAuthCookie(AUTH_COOKIE_KEY) !== 'true') {
      return false;
    }
    const token = this.obtenerToken();
    if (!token) {
      return false;
    }
    return !this.estaVencido(token, 0);
  }

  obtenerToken(): string | null {
    return getAuthCookie(AUTH_TOKEN_COOKIE_KEY);
  }

  obtenerExperacionToken(): string | null {
    return getAuthCookie(AUTH_TOKEN_EXPIRES_COOKIE_KEY);
  }

  obtenerRefreshToken(): string | null {
    return getAuthCookie(AUTH_REFRESH_COOKIE_KEY);
  }

  obtenerTipoToken(): string {
    return getAuthCookie(AUTH_TOKEN_TYPE_COOKIE_KEY) ?? 'Bearer';
  }

  cerrarSessionPorInactividad(): void {
    if (this.refreshTokenExpirado()) {
      this.cerrarSesionPorExpiracion();
    }
  }

  /** Cierre local y aviso en login (inactividad o 401 sin refresh válido). */
  cerrarSesionPorExpiracion(
    mensaje: string = MENSAJE_SESION_CERRADA_INACTIVIDAD,
  ): void {
    this.redirigirLoginTrasCierre(mensaje);
  }

  consumirMensajeCierreSesion(): string | null {
    const mensaje = sessionStorage.getItem(AUTH_MENSAJE_CIERRE_SESSION_KEY);
    if (mensaje) {
      sessionStorage.removeItem(AUTH_MENSAJE_CIERRE_SESSION_KEY);
    }
    return mensaje;
  }

  private redirigirLoginTrasCierre(mensaje?: string): void {
    this.limpiarSesionLocal();
    if (mensaje?.trim()) {
      sessionStorage.setItem(AUTH_MENSAJE_CIERRE_SESSION_KEY, mensaje.trim());
    }
    void this.router.navigate(['/']);
  }

  private iniciarControlInactividad(): void {
    this.detenerControlInactividad();
    this.controlInactividadIntervalId = setInterval(
      () => this.cerrarSessionPorInactividad(),
      INTERVAL_CONTROL_INACTIVIDAD_MS,
    );
  }

  private detenerControlInactividad(): void {
    if (this.controlInactividadIntervalId !== null) {
      clearInterval(this.controlInactividadIntervalId);
      this.controlInactividadIntervalId = null;
    }
  }

  /** true si no hay access o está vencido (expiración desde `token_expires_in` al guardar), con margen anticipado. */
  tokenDeAccesoVencido(margenSegundos = MARGEN_RENOVACION_ACCESS_SEG): boolean {
    const token = this.obtenerToken();
    if (!token) {
      return true;
    }
    return this.estaVencido(token, margenSegundos);
  }

  /** true si el refresh no existe o venció (`refresh_token_expires_in` al guardar). */
  refreshTokenVencido(margenSegundos = 0): boolean {
    const refresh = this.obtenerRefreshToken();
    if (!refresh) {
      return true;
    }
    return this.refreshTokenExpirado(margenSegundos);
  }

  /** Devuelve un token vigente: el actual si no venció, o uno nuevo vía refresh. */
  obtenerTokenValido(): Observable<string | null> {
    const token = this.obtenerToken();

    if (token && !this.estaVencido(token)) {
      return of(token);
    }
    if (!this.obtenerRefreshToken()) {
      return of(null);
    }
    return this.refrescarToken().pipe(catchError(() => of(null)));
  }

  /** Una sola llamada a /auth/refresh aunque haya varias peticiones en paralelo. */
  refrescarToken(): Observable<string> {
    if (!this.obtenerRefreshToken()) {
      return throwError(() => new Error('Sin refresh token'));
    }

    if (!this.refresh$) {
      this.refresh$ = this.http
        .post<RefreshTokenResponse>(
          `${environment.SAUL3_API_URL}/auth/refresh`,
          {},
          { headers: { Authorization: `Bearer ${this.obtenerRefreshToken()}` } },
        )
        .pipe(
          map((response): RefreshTokensPayload => {
            if (!response.success || !response.data) {
              throw new Error(response.message ?? 'No se pudo renovar la sesión.');
            }
            return {
              access_token: response.data.token,
              refresh_token: response.data.refresh_token,
              token_type: response.data.token_type,
              token_expires_at: response.data.token_expires_at,
              token_expires_in: response.data.token_expires_in,
              refresh_token_expires_at: response.data.refresh_token_expires_at,
              refresh_token_expires_in: response.data.refresh_token_expires_in,
            };
          }),
          tap((res) => this.guardarTokens(res)),
          map((res) => res.access_token),
          finalize(() => {
            this.refresh$ = null;
          }),
          shareReplay(1),
        );
    }

    return this.refresh$;
  }


  /** Expiración del access token en ms (cookie guardada al login/refresh), o null si no hay dato válido. */
  private obtenerExpiracionTokenMs(): number | null {
    const raw = getAuthCookie(AUTH_TOKEN_EXPIRES_COOKIE_KEY);
    if (!raw) {
      return null;
    }
    const ms = Number(raw);
    return Number.isFinite(ms) ? ms : null;
  }

  private obtenerExpiracionRefreshTokenMs(): number | null {
    const raw = getAuthCookie(AUTH_REFRESH_EXPIRES_COOKIE_KEY);
    if (!raw) {
      return null;
    }
    const ms = Number(raw);
    return Number.isFinite(ms) ? ms : null;
  }

  /**
   * true si ya pasó la expiración del access o faltan ≤ `margenSegundos` (renovación anticipada).
   */
  public tokenExpirado(margenSegundos = MARGEN_RENOVACION_ACCESS_SEG): boolean {
    const expiraEnMs = this.obtenerExpiracionTokenMs();
    if (expiraEnMs === null) {
      return false;
    }
    return this.compararConFechaExpiracion(expiraEnMs, margenSegundos);
  }

  /**
   * true si ya pasó la expiración del refresh o faltan ≤ `margenSegundos`.
   */
  public refreshTokenExpirado(margenSegundos = MARGEN_RENOVACION_REFRESH_SEG): boolean {
    const expiraEnMs = this.obtenerExpiracionRefreshTokenMs();
    if (expiraEnMs === null) {
      return false;
    }
    return this.compararConFechaExpiracion(expiraEnMs, margenSegundos);
  }

  /** Compara una fecha ISO de la API con la fecha actual. */
  expiradoSegunIso(fechaExpiracionIso: string | undefined, margenSegundos = 0): boolean {
    const expiraEnMs = this.milisegundosDesdeIso(fechaExpiracionIso);
    if (expiraEnMs === null) {
      return false;
    }
    return this.compararConFechaExpiracion(expiraEnMs, margenSegundos);
  }

  public estaVencido(token: string, margenSegundos = MARGEN_RENOVACION_ACCESS_SEG): boolean {
    const refresh = this.obtenerRefreshToken();
    if (refresh && token === refresh) {
      return this.refreshTokenExpirado(margenSegundos);
    }
    return this.tokenExpirado(margenSegundos);
  }

  /** Compara `token_expires_at` (ms) con Date.now(); margen = renovar antes de llegar a cero. */
  private compararConFechaExpiracion(expiraEnMs: number, margenSegundos: number): boolean {
    const ahora = Date.now();
    if (ahora >= expiraEnMs) {
      return true;
    }
    if (margenSegundos <= 0) {
      return false;
    }
    return expiraEnMs - ahora <= margenSegundos * 1000;
  }

  private guardarTokens(res: RefreshTokensPayload): void {
    this.guardarParTokens({
      token: res.access_token,
      refresh_token: res.refresh_token,
      token_type: res.token_type ?? 'Bearer',
      refresh_token_type: 'Bearer',
      token_expires_at: res.token_expires_at,
      token_expires_in: res.token_expires_in,
      refresh_token_expires_at: res.refresh_token_expires_at,
      refresh_token_expires_in: res.refresh_token_expires_in,
    });
  }

  obtenerUsuario(): UsuarioAuth | null {
    const raw = getAuthCookie(`${AUTH_COOKIE_KEY}-user`);

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as UsuarioAuth;
    } catch {
      return null;
    }
  }

  establecerSesion(usuario: UsuarioAuth, tokens: TokenParData): void {
    setAuthCookie(AUTH_COOKIE_KEY, 'true');
    this.guardarParTokens(tokens);

    const { roles: _roles, ...perfil } = usuario;
    setAuthCookie(`${AUTH_COOKIE_KEY}-user`, JSON.stringify(perfil));

    deleteAuthCookie(`${AUTH_COOKIE_KEY}-roles`);
    sessionStorage.removeItem(AUTH_ROLES_SESSION_KEY);
    sessionStorage.removeItem(AUTH_ROLES_SESSION_KEY_LEGACY);

    this.iniciarControlInactividad();
    this.permisos.cargar().subscribe();
  }

  guardarParTokens(tokens: TokenParData): void {
    setAuthCookie(AUTH_TOKEN_COOKIE_KEY, tokens.token);
    setAuthCookie(AUTH_TOKEN_TYPE_COOKIE_KEY, tokens.token_type ?? 'Bearer');
    setAuthCookie(AUTH_REFRESH_COOKIE_KEY, tokens.refresh_token);

    setAuthCookie(
      AUTH_TOKEN_EXPIRES_COOKIE_KEY,
      String(this.milisegundosExpiracionAcceso(tokens)),
    );

    setAuthCookie(
      AUTH_REFRESH_EXPIRES_COOKIE_KEY,
      String(this.milisegundosExpiracionRefresh(tokens)),
    );
  }

  /**
   * Expiración absoluta del access: prioriza `token_expires_in` desde la respuesta (p. ej. 20 s),
   * luego `token_expires_at`, y por último el TTL por defecto.
   */
  private milisegundosExpiracionAcceso(tokens: ExpiracionTokenPar): number {
    const inSec = tokens.token_expires_in;
    if (inSec != null && inSec > 0) {
      return Date.now() + inSec * 1000;
    }
    const fromIso = this.milisegundosDesdeIso(tokens.token_expires_at);
    if (fromIso !== null) {
      return fromIso;
    }
    return Date.now() + ACCESS_TOKEN_TTL_MS;
  }

  /** Igual que access, con `refresh_token_expires_in` (p. ej. 60 s). */
  private milisegundosExpiracionRefresh(tokens: ExpiracionTokenPar): number {
    const inSec = tokens.refresh_token_expires_in;
    if (inSec != null && inSec > 0) {
      return Date.now() + inSec * 1000;
    }
    const fromIso = this.milisegundosDesdeIso(tokens.refresh_token_expires_at);
    if (fromIso !== null) {
      return fromIso;
    }
    return Date.now() + REFRESH_TOKEN_TTL_MS;
  }

  private milisegundosDesdeIso(iso?: string): number | null {
    if (!iso) {
      return null;
    }
    const ms = Date.parse(iso);
    return Number.isFinite(ms) ? ms : null;
  }

  login(usuario: string, contrasena: string): Observable<LoginResult> {
    return this.http
      .post<LoginResponse>(`${environment.SAUL3_API_URL}/auth/login`, {
        usuario,
        contrasena,
      })
      .pipe(
        map((response) => {
          if (response.success && response.data) {
            const { id, username, nombre, email, roles, ...tokenPar } = response.data;
            this.establecerSesion(
              {
                id,
                username,
                nombre,
                correo: email,
                roles,
              },
              tokenPar,
            );
            return { success: true, message: response.message };
          }
          return {
            success: false,
            message: response.message ?? 'Usuario o contraseña incorrectos.',
          };
        }),
        catchError((error) =>
          of({
            success: false,
            message:
              error?.error?.message ??
              'No fue posible iniciar sesión. Intente nuevamente.',
          }),
        ),
      );
  }

  irAlInicio(): void {
    void this.router.navigate(['/']);
  }

  limpiarSesionLocal(): void {
    this.detenerControlInactividad();
    this.permisos.limpiar();
    deleteAuthCookie(AUTH_COOKIE_KEY);
    deleteAuthCookie(AUTH_TOKEN_COOKIE_KEY);
    deleteAuthCookie(AUTH_TOKEN_TYPE_COOKIE_KEY);
    deleteAuthCookie(AUTH_REFRESH_COOKIE_KEY);
    deleteAuthCookie(AUTH_TOKEN_EXPIRES_COOKIE_KEY);
    deleteAuthCookie(AUTH_REFRESH_EXPIRES_COOKIE_KEY);
    deleteAuthCookie(`${AUTH_COOKIE_KEY}-user`);
    deleteAuthCookie(`${AUTH_COOKIE_KEY}-roles`);
    sessionStorage.removeItem(AUTH_ROLES_SESSION_KEY);
    sessionStorage.removeItem(AUTH_ROLES_SESSION_KEY_LEGACY);
    sessionStorage.removeItem('auth-permisos-cache');
  }

  /** Cierra sesión en servidor (si hay token) y limpia cookies locales. */
  cerrarSesion$(): Observable<void> {
    const limpiarLocal = (): void => {
      this.limpiarSesionLocal();
      void this.router.navigate(['/']);
    };

    if (!this.obtenerToken()) {
      limpiarLocal();
      return of(undefined);
    }

    return this.http
      .post<{ success: boolean; message?: string }>(
        `${environment.SAUL3_API_URL}/auth/logout`,
        {},
      )
      .pipe(
        catchError(() => of({ success: false })),
        tap(() => limpiarLocal()),
        map(() => undefined),
      );
  }

  cerrarSesion(): void {
    this.cerrarSesion$().subscribe();
  }
}