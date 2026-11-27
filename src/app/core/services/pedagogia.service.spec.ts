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
