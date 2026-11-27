import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { PedagogiaService } from '../../../core/services/pedagogia.service';
import { ProgramarPedagogia } from './programar-pedagogia';

describe('ProgramarPedagogia', () => {
  let fixture: ComponentFixture<ProgramarPedagogia>;
  let datosInicialesProgramacionPedagogia: ReturnType<typeof vi.fn>;
  let guardarProgramacionPedagogia: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    datosInicialesProgramacionPedagogia = vi.fn().mockReturnValue(
      of({
        success: true,
        message: 'OK',
        data: {
          capacitadores: [{ id: 7903, nombre: 'Pedro A Perez Muriel A' }],
          pedagogias: [
            {
              id: 1,
              tipo: 'Pedagogía',
              nombre: 'Cultura ciudadana',
              descripcion: 'Jornada pedagógica',
            },
          ],
          fechas: [{ fecha: '2026-12-10' }],
        },
      }),
    );
    guardarProgramacionPedagogia = vi.fn().mockReturnValue(
      of({ success: true, message: 'Programación creada correctamente.', data: null }),
    );

    await TestBed.configureTestingModule({
      imports: [ProgramarPedagogia],
      providers: [
        provideRouter([]),
        {
          provide: PedagogiaService,
          useValue: {
            datosInicialesProgramacionPedagogia,
            guardarProgramacionPedagogia,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProgramarPedagogia);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('carga los catálogos y fechas del endpoint inicial', () => {
    expect(datosInicialesProgramacionPedagogia).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.textContent).toContain('Cultura ciudadana');
    expect(fixture.nativeElement.textContent).toContain('Pedro A Perez Muriel A');
    expect(fixture.nativeElement.querySelector('#fecha-pedagogia option[value="2026-12-10"]'))
      .toBeTruthy();
  });

  it('genera horarios en intervalos de diez minutos según duración y fecha', () => {
    const componente = fixture.componentInstance;
    componente.formulario.controls.duracion.setValue('60');
    componente.formulario.controls.fecha.setValue('2026-12-10');
    componente.consultarHorarios();

    expect(componente.horasDisponibles()[0]).toBe('08:00');
    expect(componente.horasDisponibles()).toContain('08:10');
    expect(componente.horasDisponibles().at(-1)).toBe('19:00');
    expect(componente.horasDisponibles()).toHaveLength(67);
  });

  it('envía la programación seleccionada con sus fechas ISO', () => {
    const componente = fixture.componentInstance;
    componente.formulario.setValue({
      duracion: '60',
      fecha: '2026-12-10',
      hora: '08:00',
      pedagogiaId: '1',
      cupo: 10,
      capacitadorId: '7903',
      modalidad: 'presencial',
      lugar: 'Control a Construcciones HOLA',
      observaciones: '',
    });

    componente.guardar();

    const fechaInicial = new Date(2026, 11, 10, 8, 0);
    expect(guardarProgramacionPedagogia).toHaveBeenCalledWith({
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
      modalidad: 'presencial',
      lugar: 'Control a Construcciones HOLA',
      observaciones: '',
      fechaInicialISO: fechaInicial.toISOString(),
      fechaFinalISO: new Date(fechaInicial.getTime() + 60 * 60_000).toISOString(),
    });
    expect(componente.resultado()?.tipo).toBe('exito');
  });

  it('no guarda cuando faltan campos requeridos', () => {
    fixture.componentInstance.guardar();

    expect(guardarProgramacionPedagogia).not.toHaveBeenCalled();
    expect(fixture.componentInstance.formularioEnviado()).toBe(true);
  });
});
