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
  AUTH_COOKIE_KEY,
  AUTH_REFRESH_COOKIE_KEY,
  AUTH_TOKEN_COOKIE_KEY,
  AUTH_REFRESH_EXPIRES_COOKIE_KEY,
  AUTH_TOKEN_EXPIRES_COOKIE_KEY,
  AUTH_TOKEN_TYPE_COOKIE_KEY,
} from '../constants/auth-cookie-keys';
import {
  cookieFits,
  deleteAuthCookie,
  getAuthCookie,
  setAuthCookie,
} from '../utils/auth-cookie.util';

const ROLES_OVERFLOW_KEY = `${AUTH_COOKIE_KEY}-roles`;

interface RefreshTokensPayload {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  token_expires_at?: string;
  refresh_token_expires_at?: string;
}

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

  private refresh$: Observable<string> | null = null;

  isAuthenticated(): boolean {
    return getAuthCookie(AUTH_COOKIE_KEY) === 'true' && !!this.obtenerToken();
  }

  obtenerToken(): string | null {
    return getAuthCookie(AUTH_TOKEN_COOKIE_KEY);
  }

  obtenerRefreshToken(): string | null {
    return getAuthCookie(AUTH_REFRESH_COOKIE_KEY);
  }

  obtenerTipoToken(): string {
    return getAuthCookie(AUTH_TOKEN_TYPE_COOKIE_KEY) ?? 'Bearer';
  }

  /** true si no hay access o está vencido (cookie/API o JWT), con margen de renovación anticipada. */
  tokenDeAccesoVencido(margenSegundos = 30): boolean {
    const token = this.obtenerToken();
    if (!token) {
      return true;
    }
    return this.estaVencido(token, margenSegundos);
  }

  /** true si el refresh token no existe o ya expiró según la cookie de la API. */
  refreshTokenVencido(margenSegundos = 0): boolean {
    const refresh = this.obtenerRefreshToken();
    if (!refresh) {
      return true;
    }
    const raw = getAuthCookie(AUTH_REFRESH_EXPIRES_COOKIE_KEY);
    if (!raw) {
      return false;
    }
    const expiraEn = Number(raw);
    if (!Number.isFinite(expiraEn)) {
      return true;
    }
    return expiraEn <= Date.now() + margenSegundos * 1000;
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
        .post<RefreshTokenResponse>(`${environment.SAUL3_API_URL}/auth/refresh`, {})
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
              refresh_token_expires_at: response.data.refresh_token_expires_at,
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

  private estaVencido(token: string, margenSegundos = 30): boolean {
    if (this.esJwt(token)) {
      try {
        const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const { exp } = JSON.parse(atob(base64)) as { exp?: number };
        if (!exp) {
          return false;
        }
        return exp * 1000 <= Date.now() + margenSegundos * 1000;
      } catch {
        return true;
      }
    }

    const raw = getAuthCookie(AUTH_TOKEN_EXPIRES_COOKIE_KEY);
    if (!raw) {
      return false;
    }
    const expiraEn = Number(raw);
    if (!Number.isFinite(expiraEn)) {
      return true;
    }
    return expiraEn <= Date.now() + margenSegundos * 1000;
  }

  private esJwt(token: string): boolean {
    const partes = token.split('.');
    return partes.length >= 3 && partes[1].length > 0;
  }

  private guardarTokens(res: RefreshTokensPayload): void {
    this.guardarParTokens({
      token: res.access_token,
      refresh_token: res.refresh_token,
      token_type: res.token_type ?? 'Bearer',
      refresh_token_type: 'Bearer',
      token_expires_at: res.token_expires_at,
      refresh_token_expires_at: res.refresh_token_expires_at,
    });
  }

  obtenerUsuario(): UsuarioAuth | null {
    const raw = getAuthCookie(`${AUTH_COOKIE_KEY}-user`);

    if (!raw) {
      return null;
    }

    try {
      const usuario = JSON.parse(raw) as UsuarioAuth;
      const rolesCookie = getAuthCookie(`${AUTH_COOKIE_KEY}-roles`);
      if (rolesCookie) {
        usuario.roles = JSON.parse(rolesCookie) as string[];
      } else {
        const rolesOverflow = sessionStorage.getItem(ROLES_OVERFLOW_KEY);
        if (rolesOverflow) {
          usuario.roles = JSON.parse(rolesOverflow) as string[];
        }
      }
      return usuario;
    } catch {
      return null;
    }
  }

  establecerSesion(usuario: UsuarioAuth, tokens: TokenParData): void {
    setAuthCookie(AUTH_COOKIE_KEY, 'true');
    this.guardarParTokens(tokens);

    const { roles, ...perfil } = usuario;
    setAuthCookie(`${AUTH_COOKIE_KEY}-user`, JSON.stringify(perfil));

    if (roles?.length) {
      const rolesJson = JSON.stringify(roles);
      if (cookieFits(rolesJson)) {
        setAuthCookie(`${AUTH_COOKIE_KEY}-roles`, rolesJson);
        sessionStorage.removeItem(ROLES_OVERFLOW_KEY);
      } else {
        sessionStorage.setItem(ROLES_OVERFLOW_KEY, rolesJson);
        deleteAuthCookie(`${AUTH_COOKIE_KEY}-roles`);
      }
    } else {
      deleteAuthCookie(`${AUTH_COOKIE_KEY}-roles`);
      sessionStorage.removeItem(ROLES_OVERFLOW_KEY);
    }
  }

  guardarParTokens(tokens: TokenParData): void {
    setAuthCookie(AUTH_TOKEN_COOKIE_KEY, tokens.token);
    setAuthCookie(AUTH_TOKEN_TYPE_COOKIE_KEY, tokens.token_type ?? 'Bearer');
    setAuthCookie(AUTH_REFRESH_COOKIE_KEY, tokens.refresh_token);

    const accessExpiresMs = this.milisegundosDesdeIso(tokens.token_expires_at);
    setAuthCookie(
      AUTH_TOKEN_EXPIRES_COOKIE_KEY,
      String(accessExpiresMs ?? Date.now() + ACCESS_TOKEN_TTL_MS),
    );

    const refreshExpiresMs = this.milisegundosDesdeIso(tokens.refresh_token_expires_at);
    if (refreshExpiresMs !== null) {
      setAuthCookie(AUTH_REFRESH_EXPIRES_COOKIE_KEY, String(refreshExpiresMs));
    }
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
            void this.router.navigate(['/gestion-acceso-justicia/comparendo/descargar']);
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
    deleteAuthCookie(AUTH_COOKIE_KEY);
    deleteAuthCookie(AUTH_TOKEN_COOKIE_KEY);
    deleteAuthCookie(AUTH_TOKEN_TYPE_COOKIE_KEY);
    deleteAuthCookie(AUTH_REFRESH_COOKIE_KEY);
    deleteAuthCookie(AUTH_TOKEN_EXPIRES_COOKIE_KEY);
    deleteAuthCookie(AUTH_REFRESH_EXPIRES_COOKIE_KEY);
    deleteAuthCookie(`${AUTH_COOKIE_KEY}-user`);
    deleteAuthCookie(`${AUTH_COOKIE_KEY}-roles`);
    sessionStorage.removeItem(ROLES_OVERFLOW_KEY);
  }

  cerrarSesion(): void {
    const limpiarLocal = (): void => {
      this.limpiarSesionLocal();
      void this.router.navigate(['/']);
    };

    if (!this.obtenerToken()) {
      limpiarLocal();
      return;
    }

    this.http
      .post<{ success: boolean; message?: string }>(
        `${environment.SAUL3_API_URL}/auth/logout`,
        {},
      )
      .pipe(catchError(() => of({ success: false })))
      .subscribe(() => limpiarLocal());
  }
}
