import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PedagogiaService } from './pedagogia.service';

describe('PedagogiaService', () => {
  let service: PedagogiaService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(PedagogiaService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('carga los datos iniciales del formulario de programación', () => {
    service.datosInicialesProgramacionPedagogia().subscribe();

    const request = httpTesting.expectOne('http://localhost:8000/api/pedagogia/inicial');
    expect(request.request.method).toBe('GET');
    request.flush({
      success: true,
      data: { capacitadores: [], pedagogias: [], fechas: [] },
    });
  });

  it('guarda una programación de pedagogía', () => {
    const fechaInicial = new Date(2026, 11, 10, 8, 0);
    const payload = {
      duracion: 60,
      fechaCita: { fecha: '2026-12-10' },
      horaCita: { hora: fechaInicial },
      pedagogia: {
        id: 1,
        tipo: 'Pedagogía',
        nombre: 'Cultura ciudadana',
        descripcion: 'Jornada pedagógica',
      },
      cupo: 10,
      responsable: { id: 7903, nombre: 'Pedro A Perez Muriel A' },
      modalidad: 'presencial' as const,
      lugar: 'Control a Construcciones HOLA',
      observaciones: '',
      fechaInicialISO: fechaInicial.toISOString(),
      fechaFinalISO: new Date(fechaInicial.getTime() + 60 * 60_000).toISOString(),
    };

    service.guardarProgramacionPedagogia(payload).subscribe();

    const request = httpTesting.expectOne(
      'http://localhost:8000/api/controlpolicivo/programacionpedagogia',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush({ success: true, message: 'Programación creada.', data: null });
  });

  it('consulta los comportamientos contrarios', () => {
    service.listarComportamientosContrarios().subscribe();

    const request = httpTesting.expectOne(
      'http://localhost:8000/api/controlpolicivo/comportamientocontrario',
    );
    expect(request.request.method).toBe('GET');
    request.flush([{ id: 459, descripcion: 'Acuerdo de Pago' }]);
  });

  it('crea pedagogía con sus comportamientos seleccionados', () => {
    const payload = {
      tipo: 'Comparendo',
      nombre: 'Pedagogía sobre convivencia ciudadana',
      descripcion: 'Actividad pedagógica orientada a fortalecer la convivencia ciudadana.',
      comportamientosIds: [1, 2, 3],
    };

    service.crearPedagogia(payload).subscribe();

    const request = httpTesting.expectOne(
      'http://localhost:8000/api/controlpolicivo/pedagogia',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush({ success: true, message: 'OK', data: null });
  });

  it('consulta los asistentes usando el ID de la programación', () => {
    service.listarAsistentesProgramacion(4388).subscribe();

    const request = httpTesting.expectOne(
      'http://localhost:8000/api/controlpolicivo/registrarasistenciapedagogia/4388',
    );
    expect(request.request.method).toBe('GET');
    request.flush({ success: true, message: 'OK', data: [] });
  });

  it('registra la asistencia con el payload indicado', () => {
    const payload = {
      programacionPedagogia: { id: 4388 },
      data: [
        { idComparendo: 619936, check: true },
        { idComparendo: 619937, check: false },
      ],
    };

    service.registrarAsistenciaPedagogia(payload).subscribe();

    const request = httpTesting.expectOne(
      'http://localhost:8000/api/controlpolicivo/asistentesprogramacionpedagogia',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush({ success: true, message: 'OK', data: [] });
  });

  it('solicita el PDF de asistencia usando el ID de la programación', () => {
    service.imprimirAsistenciaPedagogia(4388).subscribe();

    const request = httpTesting.expectOne(
      'http://localhost:8000/api/programacion-pedagogia/4388/imprimir-asistencia',
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.responseType).toBe('blob');
    request.flush(new Blob(['pdf']));
  });
});
