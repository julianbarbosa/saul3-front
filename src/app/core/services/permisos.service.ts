import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, map, Observable, of, shareReplay, tap } from 'rxjs';

import { AUTH_COOKIE_KEY } from '../constants/auth-cookie-keys';
import { PERMISOS_API_URL } from '../constants/permisos.constants';
import { PermisosUsuarioResponse } from '../interfaces/permisos-api.interface';
import { getAuthCookie } from '../utils/auth-cookie.util';

/**
 * Permisos en memoria para mostrar u ocultar UI.
 * No sustituye la autorización del backend en cada petición.
 */
@Injectable({ providedIn: 'root' })
export class PermisosService {
  private readonly http = inject(HttpClient);

  private readonly permisosSet = signal<ReadonlySet<string>>(new Set());
  private readonly userIdSignal = signal<number | null>(null);

  /** Lista de solo lectura (reactiva). */
  readonly permisos = computed(() => [...this.permisosSet()]);

  readonly userId = computed(() => this.userIdSignal());

  /** True tras al menos un intento de carga con sesión activa o tras limpiar. */
  readonly listo = signal(false);

  private cargar$: Observable<void> | null = null;

  tiene(codigo: string | null | undefined): boolean {
    if (!codigo?.trim()) {
      return false;
    }
    const tienePermiso = this.permisosSet().has(codigo.trim());
    console.log(codigo.trim() + '= '+tienePermiso);
    return tienePermiso;
  }

  tieneAlguno(codigos: readonly string[]): boolean {
    return codigos.some((c) => this.tiene(c));
  }

  tieneTodos(codigos: readonly string[]): boolean {
    return codigos.length > 0 && codigos.every((c) => this.tiene(c));
  }

  /** Consulta el backend y actualiza el estado en memoria. */
  cargar(): Observable<void> {
    if (getAuthCookie(AUTH_COOKIE_KEY) !== 'true' || !getAuthCookie(`${AUTH_COOKIE_KEY}-token`)) {
      this.limpiar();
      return of(undefined);
    }

    if (!this.cargar$) {
      this.cargar$ = this.http.get<PermisosUsuarioResponse>(PERMISOS_API_URL).pipe(
        tap((res) => this.aplicarRespuesta(res)),
        catchError(() => {
          this.aplicarLista([]);
          return of(null);
        }),
        map(() => undefined),
        finalize(() => {
          this.cargar$ = null;
          this.listo.set(true);
        }),
        shareReplay(1),
      );
    }

    return this.cargar$;
  }

  /** Una sola recarga ante 403 (interceptor). */
  refrescarPor403(): Observable<void> {
    return this.cargar();
  }

  limpiar(): void {
    this.permisosSet.set(new Set());
    this.userIdSignal.set(null);
    this.listo.set(true);
  }

  private aplicarRespuesta(res: PermisosUsuarioResponse): void {
    if (res.success === false) {
      this.aplicarLista([]);
      this.userIdSignal.set(null);
      return;
    }
    this.userIdSignal.set(res.id ?? null);
    this.aplicarLista(res.permisos ?? []);
  }

  private aplicarLista(permisos: string[]): void {
    const set = new Set(permisos.filter((p) => typeof p === 'string' && p.length > 0));
    this.permisosSet.set(set);
  }
}