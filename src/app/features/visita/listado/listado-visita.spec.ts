import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { VisitaService } from '../../../core/services/visita.service';
import {
  claseFilaVisita,
  formatearFechaSaul,
  opcionesVisitadores,
  urlRadicado,
} from './listado-visita';

/** Lee los parámetros `{name, value}` tal como los recibe saul2. */
function parametrosEnviados(params: {
  keys(): string[];
  get(k: string): string | null;
}): Record<string, unknown> {
  const salida: Record<string, unknown> = {};
  for (const clave of params.keys()) {
    const { name, value } = JSON.parse(params.get(clave) ?? '{}');
    salida[name] = value;
  }
  return salida;
}

describe('Listado de visitas', () => {
  let servicio: VisitaService;
  let http: HttpTestingController;
  const url = `${environment.SAUL2_API_URL}/visita`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(VisitaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('pendientes: manda página, tamaño y filtros como JSON {name, value}, sin type', () => {
    servicio
      .listarPendientes({ page: 2, pageSize: 20, filtros: { direccion: 'CL 5', visitador: '' } })
      .subscribe();
    const peticion = http.expectOne((r) => r.url === url);
    expect(peticion.request.method).toBe('GET');
    expect(parametrosEnviados(peticion.request.params)).toEqual({
      currentPage: 2,
      numPerPage: 20,
      orderBy: 'idsolicitud',
      orderDir: 'ASC',
      direccion: 'CL 5',
    });
    peticion.flush({ data: [], totalItems: 0 });
  });

  it('todas: agrega type=all', () => {
    servicio.listarTodas({ page: 1, pageSize: 10, filtros: {} }).subscribe();
    const peticion = http.expectOne((r) => r.url === url);
    expect(parametrosEnviados(peticion.request.params)['type']).toBe('all');
    peticion.flush({ data: [], totalItems: 0 });
  });

  it('emitidas: fuerza estado Emitido aunque la tabla mande otro', () => {
    servicio
      .listarEmitidas({ page: 1, pageSize: 10, filtros: { nombreEstado: 'Pendiente' } })
      .subscribe();
    const peticion = http.expectOne((r) => r.url === url);
    const enviados = parametrosEnviados(peticion.request.params);
    expect(enviados['type']).toBe('all');
    expect(enviados['nombreEstado']).toBe('Emitido');
    peticion.flush({ data: [], totalItems: 0 });
  });

  it('formatea fechas de SAUL ({timestamp} o texto) y deja vacío lo que no viene', () => {
    const local = new Date(2026, 9, 30, 15, 4, 5).getTime() / 1000;
    expect(formatearFechaSaul({ timestamp: local })).toBe('2026-10-30 15:04:05');
    expect(formatearFechaSaul('2026-10-30 10:00:00')).toBe('2026-10-30 10:00:00');
    expect(formatearFechaSaul(null)).toBe('');
  });

  it('colorea la fila según rowWarning (número o texto)', () => {
    expect(claseFilaVisita({ idvisita: 1, idsolicitud: 1, rowWarning: 1 })).toBe(
      'fila-alerta-alta',
    );
    expect(claseFilaVisita({ idvisita: 1, idsolicitud: 1, rowWarning: '2' })).toBe(
      'fila-alerta-media',
    );
    expect(claseFilaVisita({ idvisita: 1, idsolicitud: 1, rowWarning: 0 })).toBeNull();
  });

  it('manda orderBy y orderDir cuando la pantalla ordena', () => {
    servicio
      .listarPendientes({
        page: 1,
        pageSize: 10,
        filtros: {},
        orderBy: 'direccion',
        orderDir: 'DESC',
      })
      .subscribe();
    const peticion = http.expectOne((r) => r.url === url);
    const enviados = parametrosEnviados(peticion.request.params);
    expect(enviados['orderBy']).toBe('direccion');
    expect(enviados['orderDir']).toBe('DESC');
    peticion.flush({ data: [], totalItems: 0 });
  });

  it('arma el enlace del radicado solo si hay radicado', () => {
    expect(urlRadicado('2026413', '123')).toContain('id=2026413&doc=123');
    expect(urlRadicado('', '123')).toBeNull();
  });

  it('opciones de visitador sin vacíos ni repetidos', () => {
    const opciones = opcionesVisitadores({
      data: [],
      totalItems: 0,
      visitadores: [
        { visitador: 'Ana' },
        { visitador: null },
        { visitador: 'Ana' },
        { visitador: ' ' },
      ],
    });
    expect(opciones).toEqual([{ label: 'Ana', value: 'Ana' }]);
  });
});
