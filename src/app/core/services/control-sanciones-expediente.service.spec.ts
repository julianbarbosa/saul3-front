import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ControlSancionesExpedienteService } from './control-sanciones-expediente.service';

describe('ControlSancionesExpedienteService', () => {
  let servicio: ControlSancionesExpedienteService;
  let http: HttpTestingController;
  const base = environment.SAUL3_API_URL.replace(/\/$/, '');

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(ControlSancionesExpedienteService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('listarExpedientesPorEstado desempaqueta data[] del JSON SAUL3', async () => {
    const filas = firstValueFrom(servicio.listarExpedientesPorEstado('pendiente'));
    const req = http.expectOne(`${base}/controlsanciones/expediente/get?estado=pendiente`);
    expect(req.request.method).toBe('GET');
    req.flush({
      success: true,
      data: [{ id: 10, formato: 'CMP-1', nombre: 'Juan Pérez', updatedAt: { timestamp: 1_700_000_000 } }],
    });
    const resultado = await filas;
    expect(resultado.length).toBe(1);
    expect(resultado[0].id).toBe(10);
    expect(resultado[0].formato).toBe('CMP-1');
  });

  it('listarExpedientesPorEstado incluye inspeccion si se envía', () => {
    servicio.listarExpedientesPorEstado('rechazado', 3).subscribe();
    const req = http.expectOne(
      `${base}/controlsanciones/expediente/get?estado=rechazado&inspeccion=3`,
    );
    req.flush({ success: true, data: [] });
  });

  it('listarExpedientesPorEstado devuelve [] si data no es arreglo', async () => {
    const filas = firstValueFrom(servicio.listarExpedientesPorEstado('aprobada'));
    http.expectOne(`${base}/controlsanciones/expediente/get?estado=aprobada`).flush({
      success: true,
      data: null,
    });
    expect(await filas).toEqual([]);
  });

  it('listarInspecciones devuelve data del envoltorio { success, data }', async () => {
    const filas = firstValueFrom(servicio.listarInspecciones());
    http.expectOne(`${base}/controlpolicivo/inspector/getall`).flush({
      success: true,
      data: [{ id: 1, nombre: 'Inspección 1' }],
    });
    expect(await filas).toEqual([{ id: 1, nombre: 'Inspección 1' }]);
  });

  it('obtenerPermisosUsuario llama GET /usuario/permisos', () => {
    servicio.obtenerPermisosUsuario().subscribe();
    http.expectOne(`${base}/usuario/permisos`).flush({ success: true, id: 1, permisos: [] });
  });
});