import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { HTTP_SKIP_LOADING } from '../interceptors/http-loading.interceptor';
import { VisitaCampo, VisitaDetalle } from '../interfaces/visita.interface';
import { aEncabezadoVisita, VisitaService } from './visita.service';

describe('VisitaService', () => {
  let servicio: VisitaService;
  let http: HttpTestingController;
  const base = environment.SAUL3_API_URL;

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

  it('guardarCampo no muestra el overlay global de carga (guardado automático)', () => {
    const campo = { codigo: 'v6_area_lote_obra', tipo: 'decimal', valor: '120' } as unknown as VisitaCampo;
    servicio.guardarCampo(7279, campo).subscribe();

    const peticion = http.expectOne(`${base}/visita`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.headers.has(HTTP_SKIP_LOADING)).toBe(true);
    peticion.flush({ success: true });
  });

  it('guardarImagen no muestra el overlay global de carga', () => {
    const campo = { codigo: 'v6_foto_fachada', tipo: 'imagen', valor: '' } as unknown as VisitaCampo;
    const archivo = new File(['x'], 'foto.jpg', { type: 'image/jpeg' });
    servicio.guardarImagen(7279, campo, archivo).subscribe();

    const peticion = http.expectOne(`${base}/visita`);
    expect(peticion.request.headers.has(HTTP_SKIP_LOADING)).toBe(true);
    peticion.flush({ success: true });
  });

  it('generarInforme hace GET a /visita/informe/{id} y devuelve el PDF como Blob', async () => {
    const respuesta = firstValueFrom(servicio.generarInforme(7279));

    const peticion = http.expectOne(`${base}/visita/informe/7279`);
    expect(peticion.request.method).toBe('GET');
    expect(peticion.request.responseType).toBe('blob');
    peticion.flush(new Blob(['%PDF-1.7'], { type: 'application/pdf' }));

    const pdf = await respuesta;
    expect(pdf.type).toBe('application/pdf');
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

    const peticion = http.expectOne((r) => r.url === `${environment.SAUL3_API_URL}/visita/tarea`);
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
  describe('autoguardado sin overlay de carga', () => {
    let servicio: VisitaService;
    let http: HttpTestingController;
    const base = environment.SAUL3_API_URL;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [provideHttpClient(), provideHttpClientTesting()],
      });
      servicio = TestBed.inject(VisitaService);
      http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    const campo: VisitaCampo = {
      id: 1,
      codigo: 'v15_corregimiento',
      nombre: 'corregimiento',
      tipo: 'texto',
      label: 'Corregimiento',
      dominio: null,
      opciones: null,
      descripcion: null,
      soloLectura: false,
      valor: 'NA',
    };

    it('guardarCampo pide omitir el overlay global', () => {
      servicio.guardarCampo(10, campo).subscribe();

      const peticion = http.expectOne(`${base}/visita`);
      expect(peticion.request.headers.has(HTTP_SKIP_LOADING)).toBe(true);
      expect(peticion.request.headers.get('Content-Type')).toBe('application/x-www-form-urlencoded');
      peticion.flush({ success: true });
    });

    it('guardarImagen pide omitir el overlay global', () => {
      const archivo = new File([new Uint8Array([0xff, 0xd8, 0xff])], 'foto.jpg', { type: 'image/jpeg' });
      servicio.guardarImagen(10, { ...campo, tipo: 'imagen' }, archivo).subscribe();

      const peticion = http.expectOne(`${base}/visita`);
      expect(peticion.request.headers.has(HTTP_SKIP_LOADING)).toBe(true);
      expect(peticion.request.body instanceof FormData).toBe(true);
      peticion.flush({ success: true, value: 'abc-0.jpg' });
    });

    it('descargarDocumento trae la imagen como Blob sin overlay', () => {
      servicio.descargarDocumento('abc-0.jpg')?.subscribe();

      const peticion = http.expectOne(`${base}/visita/documento/abc-0.jpg`);
      expect(peticion.request.responseType).toBe('blob');
      expect(peticion.request.headers.has(HTTP_SKIP_LOADING)).toBe(true);
      peticion.flush(new Blob());
    });

    it('descargarDocumento rechaza nombres con rutas', () => {
      expect(servicio.descargarDocumento('../.env')).toBeNull();
    });
  });
});
