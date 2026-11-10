import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { VisitaDetalle } from '../interfaces/visita.interface';
import { aEncabezadoVisita, VisitaService } from './visita.service';

describe('VisitaService', () => {
  let servicio: VisitaService;
  let http: HttpTestingController;
  const base = environment.SAUL2_API_URL;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(VisitaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Falla si quedó alguna petición sin atender o se hizo una que no se esperaba.
    http.verify();
  });

  it('findById hace GET a /visita/{id} sin "//" ni "phpvisita"', async () => {
    const respuesta = firstValueFrom(servicio.findById(7279));

    const peticion = http.expectOne(`${base}/visita/7279`);
    expect(peticion.request.method).toBe('GET');
    expect(peticion.request.url).not.toContain('//visita');
    expect(peticion.request.url).not.toContain('phpvisita');
    peticion.flush({ idVisita: 7279, latitud: null, longitud: null });

    expect((await respuesta).idVisita).toBe(7279);
  });

  it('findById acepta el id como texto (viene de la URL)', async () => {
    const respuesta = firstValueFrom(servicio.findById('7243'));
    http.expectOne(`${base}/visita/7243`).flush({ idVisita: 7243 });
    expect((await respuesta).idVisita).toBe(7243);
  });

  it('listarTareas hace GET a /api/visita/tarea con la consulta del listado', () => {
    servicio
      .listarTareas({ page: 2, pageSize: 20, filtros: { direccion: 'CL 5' }, orderBy: 'idvisita', orderDir: 'DESC' })
      .subscribe();

    const peticion = http.expectOne((r) => r.url === `${environment.TAREA_API_URL}/visita/tarea`);
    expect(peticion.request.method).toBe('GET');
    expect(peticion.request.url).toBe('http://localhost:8000/api/visita/tarea');
    const enviados: Record<string, unknown> = {};
    for (const clave of peticion.request.params.keys()) {
      const { name, value } = JSON.parse(peticion.request.params.get(clave) ?? '{}');
      enviados[name] = value;
    }
    expect(enviados).toEqual({
      currentPage: 2,
      numPerPage: 20,
      orderBy: 'idvisita',
      orderDir: 'DESC',
      direccion: 'CL 5',
    });
    peticion.flush({ success: true, data: [], totalItems: 0 });
  });

  it('obtenerFormulario hace GET a /visita/generar/{id}', async () => {
    const respuesta = firstValueFrom(servicio.obtenerFormulario(7054));
    const peticion = http.expectOne(`${base}/visita/generar/7054`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush([]);
    expect(await respuesta).toEqual([]);
  });

  it('findById propaga el error del servidor para que el componente lo maneje', async () => {
    const respuesta = firstValueFrom(servicio.findById(7279));
    http.expectOne(`${base}/visita/7279`).flush('Error', { status: 500, statusText: 'Server Error' });
    await expect(respuesta).rejects.toBeTruthy();
  });
});

describe('aEncabezadoVisita', () => {
  it('arma el encabezado con los datos completos de la visita', () => {
    const visita: VisitaDetalle = {
      idVisita: 3947,
      estado: { nombre: 'Pendiente por visita' },
      visitador: { firstName: 'Pedro A', lastName: 'Perez Muriel A' },
      supervisor: { firstName: ' Ana ', lastName: 'Gómez' },
      tipoVisita: { descripcion: 'Control Posterior' },
      solicitud: { radicado: '20264199800000044', radicadohijo: '2026419980000099' },
      radicadoInspeccion: null,
    };

    expect(aEncabezadoVisita(visita)).toEqual({
      consecutivo: 3947,
      estado: 'Pendiente por visita',
      visitador: 'Pedro A Perez Muriel A',
      revisor: 'Ana Gómez',
      tipoVisita: 'Control Posterior',
      radicadoSolicitud: '20264199800000044',
      radicadoRespuesta: '2026419980000099',
      radicadoInspeccion: null,
    });
  });

  it('no falla si la visita trae solo el id (sin estado, personas ni solicitud)', () => {
    expect(aEncabezadoVisita({ idVisita: 7054 })).toEqual({
      consecutivo: 7054,
      estado: '',
      visitador: '',
      revisor: '',
      tipoVisita: '',
      radicadoSolicitud: null,
      radicadoRespuesta: null,
      radicadoInspeccion: null,
    });
  });

  it('no falla si SAUL manda números u objetos donde se espera texto', () => {
    const rara = {
      idVisita: 7243,
      estado: { nombre: 5 },
      solicitud: { radicado: 2026419, radicadohijo: {} },
      radicadoInspeccion: 0,
    } as unknown as VisitaDetalle;

    const encabezado = aEncabezadoVisita(rara);

    expect(encabezado.estado).toBe('5');
    expect(encabezado.radicadoSolicitud).toBe('2026419');
    expect(encabezado.radicadoRespuesta).toBeNull();
    expect(encabezado.radicadoInspeccion).toBe('0');
  });
});
