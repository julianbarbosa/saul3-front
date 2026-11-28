import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { NEVER, of } from 'rxjs';
import { vi } from 'vitest';
import { PedagogiaService } from '../../../core/services/pedagogia.service';
import { RegistrarAsistenciaPedagogia } from './registrar-asistencia-pedagogia';

describe('RegistrarAsistenciaPedagogia', () => {
  let fixture: ComponentFixture<RegistrarAsistenciaPedagogia>;
  let listarAsistentesProgramacion: ReturnType<typeof vi.fn>;
  let registrarAsistenciaPedagogia: ReturnType<typeof vi.fn>;
  let imprimirAsistenciaPedagogia: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    imprimirAsistenciaPedagogia = vi.fn().mockReturnValue(NEVER);
    registrarAsistenciaPedagogia = vi.fn().mockReturnValue(
      of({ success: true, message: 'Asistencia registrada correctamente.', data: [] }),
    );
    listarAsistentesProgramacion = vi.fn().mockReturnValue(
      of({
        success: true,
        message: 'OK',
        data: {
          programacionPedagogia: {
            id: 4388,
            idPedagogia: 1,
            cupo: 10,
            cupoUsado: 0,
            cupoLleno: 0,
            duracion: null,
            estado: { idestado: 1, codigo: 'pendiente', nombre: 'Pendiente' },
            fecha: '2026-12-10',
            hora: '08:00:00',
            idEstado: 1,
            lugar: 'Control a Construcciones HOLA',
            modalidad: 'Presencial',
            observaciones: null,
            casaJusticia: {
              id: 409,
              tipoOrganismoId: 5,
              nombre: 'Control a Construcciones',
            },
            organismoResponsable: {
              id: 409,
              tipoOrganismoId: 5,
              nombre: 'Control a Construcciones',
            },
            pedagogia: {
              id: 1,
              tipo: 'Pedagogía',
              nombre: 'Cultura ciudadana',
              descripcion: 'Jornada pedagógica',
            },
            usuario: { id: 7903, firstName: 'Pedro A', lastName: 'Perez Muriel A' },
            createdAt: '2026-11-24 22:04:21',
            updatedAt: '2026-11-24 22:04:21',
          },
          data: [
            {
              id: 22404,
              idComparendo: 619936,
              numeroExpediente: '002',
              contacto: '3178020008',
              createdAt: '2026-06-30 20:28:33',
              descripcion: 'Comportamiento de prueba',
              fechaComparendo: '2026-06-24 20:17:31',
              fechaPedagogia: '2026-12-10',
              identificacion: '1004810625',
              nombre: 'JOEL DAVID',
              apellido: 'ORELLANOS ORTEGA',
            },
          ],
          totalItems: 1,
        },
      }),
    );

    await TestBed.configureTestingModule({
      imports: [RegistrarAsistenciaPedagogia],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: '4388' }) } },
        },
        {
          provide: PedagogiaService,
          useValue: {
            listarAsistentesProgramacion,
            registrarAsistenciaPedagogia,
            imprimirAsistenciaPedagogia,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegistrarAsistenciaPedagogia);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('consulta los asistentes del ID de la ruta y los muestra en la tabla', () => {
    const texto = fixture.nativeElement.textContent.replace(/\s+/g, ' ').trim();
    const textoDetalle = (
      fixture.nativeElement.querySelector('[aria-labelledby="programacion-titulo"]') as HTMLElement
    ).textContent.replace(/\s+/g, ' ').trim();
    const encabezados = Array.from(
      fixture.nativeElement.querySelectorAll(
        'thead tr:not(.fila-filtros-columnas) th',
      ) as NodeListOf<HTMLTableCellElement>,
    ).map((encabezado) => encabezado.textContent.trim());
    const iconosFiltro = fixture.nativeElement.querySelectorAll(
      'thead .icono-filtro',
    ) as NodeListOf<HTMLButtonElement>;
    const celdasAsistente = Array.from(
      fixture.nativeElement.querySelectorAll(
        'tbody tr:first-child td',
      ) as NodeListOf<HTMLTableCellElement>,
    );
    const casilla = fixture.nativeElement.querySelector(
      'tbody input[type="checkbox"]',
    ) as HTMLInputElement | null;

    expect(listarAsistentesProgramacion).toHaveBeenCalledWith('4388');
    expect(texto).toContain('Cultura ciudadana');
    expect(textoDetalle).toMatch(/Cupo usado\s+0/);
    expect(textoDetalle).toContain('Pedro A Perez Muriel A');
    expect(textoDetalle).not.toContain('ID');
    expect(textoDetalle).not.toContain('Estado:');
    expect(texto).toContain('JOEL DAVID ORELLANOS ORTEGA');
    expect(texto).toContain('1004810625');
    expect(encabezados).toEqual([
      'Asistió',
      'N.º Expediente / Comparendo',
      'Identificación',
      'Nombre Infractor',
      'Contacto',
      'Fecha Comparendo',
      'Comportamiento Contrario',
      'Fecha de Inscripción',
    ]);
    expect(celdasAsistente[1]?.textContent.trim()).toBe('002');
    expect(encabezados).not.toContain('Num Programación');
    expect(iconosFiltro.length).toBeGreaterThanOrEqual(2);
    const etiquetasFiltro = Array.from(iconosFiltro).map((boton) =>
      boton.getAttribute('aria-label')?.replace(/\s*\(filtro aplicado\)\s*$/, ''),
    );
    expect(etiquetasFiltro).toContain('Filtrar por Identificación');
    expect(etiquetasFiltro).toContain('Filtrar por Nombre Infractor');
    expect(fixture.nativeElement.querySelector('thead tr.fila-filtros-columnas')).toBeNull();
    expect(texto).not.toContain('ID Inscripción');
    expect(texto).not.toContain('ID Comparendo');
    expect(casilla?.checked).toBe(false);
    expect(casilla?.disabled).toBe(false);
  });

  it('filtra los asistentes por identificación y nombre seleccionados', () => {
    const componente = fixture.componentInstance;
    componente.asistentes.update((asistentes) => [
      ...asistentes,
      {
        ...asistentes[0],
        id: '22405',
        idInscripcion: '22405',
        idComparendo: 619937,
        identificacion: '2004810625',
        nombreInfractor: 'MARIA ORELLANOS',
      },
    ]);

    componente.onPaginacion({
      filter: { identificacion: '1004810625', nombreInfractor: '' },
      page: 1,
      pageSize: 10,
    });
    expect(componente.totalFiltrado()).toBe(1);
    expect(componente.filasPagina()[0].identificacion).toBe('1004810625');

    componente.onPaginacion({
      filter: { identificacion: '', nombreInfractor: 'MARIA ORELLANOS' },
      page: 1,
      pageSize: 10,
    });
    expect(componente.totalFiltrado()).toBe(1);
    expect(componente.filasPagina()[0].nombreInfractor).toBe('MARIA ORELLANOS');
  });

  it('actualiza el contador al marcar y desmarcar asistencia', () => {
    const componente = fixture.componentInstance;
    const casilla = fixture.nativeElement.querySelector(
      'tbody input[type="checkbox"]',
    ) as HTMLInputElement;

    expect(componente.asistentesMarcados()).toBe(0);
    casilla.checked = true;
    casilla.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(componente.asistentesMarcados()).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Asistencias marcadas: 1 de 1 asistentes');

    casilla.checked = false;
    casilla.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(componente.asistentesMarcados()).toBe(0);
  });

  it('pide confirmación y envía el estado de cada asistente al confirmar', () => {
    const casilla = fixture.nativeElement.querySelector(
      'tbody input[type="checkbox"]',
    ) as HTMLInputElement;
    casilla.checked = true;
    casilla.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const botonRegistrar = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((boton) => boton.textContent.includes('Registrar asistencia'));
    botonRegistrar?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      '¿Confirma que desea realizar esta acción?',
    );
    expect(registrarAsistenciaPedagogia).not.toHaveBeenCalled();

    const botonOk = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((boton) => boton.textContent.trim() === 'OK');
    botonOk?.click();
    fixture.detectChanges();

    expect(registrarAsistenciaPedagogia).toHaveBeenCalledWith({
      programacionPedagogia: { id: 4388 },
      data: [{ idComparendo: 619936, check: true }],
    });
    expect(fixture.nativeElement.textContent).toContain('Asistencia registrada correctamente.');
    expect(fixture.componentInstance.asistenciaYaRegistrada()).toBe(true);
    expect(
      (fixture.nativeElement.querySelector('.btn-primary') as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('deshabilita el registro si el servicio indica que ya estaba registrado', () => {
    registrarAsistenciaPedagogia.mockReturnValueOnce(
      of({ success: false, message: 'Esta Pedagogía ya fue registrada.', data: null }),
    );

    const botonRegistrar = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((boton) => boton.textContent.includes('Registrar asistencia'));
    botonRegistrar?.click();
    fixture.detectChanges();

    const botonOk = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((boton) => boton.textContent.trim() === 'OK');
    botonOk?.click();
    fixture.detectChanges();

    const botonAsistencia = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((boton) => boton.textContent.includes('Asistencia ya registrada'));

    expect(fixture.nativeElement.textContent).toContain('Esta Pedagogía ya fue registrada.');
    expect(fixture.componentInstance.asistenciaYaRegistrada()).toBe(true);
    expect(botonAsistencia?.disabled).toBe(true);
  });

  it('no envía la asistencia cuando se cancela la confirmación', () => {
    const botonRegistrar = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((boton) => boton.textContent.includes('Registrar asistencia'));
    botonRegistrar?.click();
    fixture.detectChanges();

    const botonCancelar = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((boton) => boton.textContent.trim() === 'Cancelar');
    botonCancelar?.click();
    fixture.detectChanges();

    expect(registrarAsistenciaPedagogia).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).not.toContain(
      '¿Confirma que desea realizar esta acción?',
    );
  });

  it('solicita el PDF de asistencia para la programación actual', () => {
    const botonImprimir = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((boton) => boton.textContent.includes('Imprimir asistencia'));

    botonImprimir?.click();
    fixture.detectChanges();

    expect(imprimirAsistenciaPedagogia).toHaveBeenCalledWith(4388);
    expect(fixture.componentInstance.imprimiendo()).toBe(true);
  });
});
