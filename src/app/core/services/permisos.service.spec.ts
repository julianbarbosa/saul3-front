import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { PERMISOS_API_URL } from '../constants/permisos.constants';
import { PermisosService } from './permisos.service';
import { AUTH_COOKIE_KEY, AUTH_TOKEN_COOKIE_KEY } from '../constants/auth-cookie-keys';

describe('PermisosService', () => {
  let servicio: PermisosService;
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    document.cookie = `${AUTH_COOKIE_KEY}=; Max-Age=0; path=/`;
    document.cookie = `${AUTH_TOKEN_COOKIE_KEY}=; Max-Age=0; path=/`;
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(PermisosService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  function simularSesion(): void {
    document.cookie = `${AUTH_COOKIE_KEY}=true; path=/`;
    document.cookie = `${AUTH_TOKEN_COOKIE_KEY}=token; path=/`;
  }

  it('tiene devuelve false si no hay permisos cargados', () => {
    expect(servicio.tiene('controlsanciones_menu')).toBe(false);
    expect(servicio.tiene('')).toBe(false);
  });

  it('cargar actualiza permisos tras respuesta exitosa', async () => {
    simularSesion();
    const carga = firstValueFrom(servicio.cargar());
    const req = http.expectOne(PERMISOS_API_URL);
    req.flush({
      success: true,
      id: 7,
      permisos: ['controlsanciones_menu', 'controlsanciones_ingresar_expediente'],
    });
    await carga;
    expect(servicio.tiene('controlsanciones_menu')).toBe(true);
    expect(servicio.tiene('no_existe')).toBe(false);
    expect(servicio.userId()).toBe(7);
  });

  it('tieneAlguno y tieneTodos', async () => {
    simularSesion();
    const carga = firstValueFrom(servicio.cargar());
    http.expectOne(PERMISOS_API_URL).flush({
      success: true,
      permisos: ['a', 'b'],
    });
    await carga;
    expect(servicio.tieneAlguno(['a', 'z'])).toBe(true);
    expect(servicio.tieneAlguno(['x', 'y'])).toBe(false);
    expect(servicio.tieneTodos(['a', 'b'])).toBe(true);
    expect(servicio.tieneTodos(['a', 'c'])).toBe(false);
  });

  it('limpiar vacía permisos en memoria', async () => {
    simularSesion();
    const carga = firstValueFrom(servicio.cargar());
    http.expectOne(PERMISOS_API_URL).flush({ success: true, permisos: ['x'] });
    await carga;
    servicio.limpiar();
    expect(servicio.tiene('x')).toBe(false);
  });

  it('segunda cargar comparte una sola petición HTTP concurrente', async () => {
    simularSesion();
    const a = firstValueFrom(servicio.cargar());
    const b = firstValueFrom(servicio.cargar());
    const reqs = http.match(PERMISOS_API_URL);
    expect(reqs.length).toBe(1);
    reqs[0].flush({ success: true, permisos: ['p'] });
    await Promise.all([a, b]);
    expect(servicio.tiene('p')).toBe(true);
  });
});