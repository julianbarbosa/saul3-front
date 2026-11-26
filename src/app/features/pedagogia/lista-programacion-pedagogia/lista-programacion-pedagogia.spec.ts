import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { PedagogiaService } from '../../../core/services/pedagogia.service';
import { ListaProgramacionPedagogia } from './lista-programacion-pedagogia';

describe('ListaProgramacionPedagogia', () => {
  let fixture: ComponentFixture<ListaProgramacionPedagogia>;
  let listarProgramacionesPedagogia: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    listarProgramacionesPedagogia = vi.fn().mockReturnValue(
      of({
        success: true,
        message: 'OK',
        data: [
          {
            id: 4388,
            fecha: '2026-12-10',
            hora: '08:00:00',
            cupo: 10,
            cupoUsado: 0,
            nombre:
              'PROGRAMA COMUNITARIO CULTURA CIUDADANA; Y CONVIVENCIA EN LOS SISTEMAS DE TRANSPORTE MASIVO',
            lugar: 'Control a Construcciones HOLA',
            createdAt: '2026-11-24 22:04:21',
            usuario: 'Pedro A Perez Muriel A',
          },
        ],
      }),
    );

    await TestBed.configureTestingModule({
      imports: [ListaProgramacionPedagogia],
      providers: [
        provideRouter([]),
        {
          provide: PedagogiaService,
          useValue: { listarProgramacionesPedagogia },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ListaProgramacionPedagogia);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('consulta el listado y muestra los campos disponibles en el JSON', () => {
    const texto = fixture.nativeElement.textContent.replace(/\s+/g, ' ').trim();
    const encabezados = Array.from(
      fixture.nativeElement.querySelectorAll('th') as NodeListOf<HTMLTableCellElement>,
    ).map((encabezado) => encabezado.textContent.trim());
    const celdas = Array.from(
      fixture.nativeElement.querySelectorAll('tbody tr:first-child td') as NodeListOf<HTMLTableCellElement>,
    );

    expect(listarProgramacionesPedagogia).toHaveBeenCalledOnce();
    expect(texto).toContain('4388');
    expect(texto).toContain('10');
    expect(texto).toContain('Pedro A Perez Muriel A');
    expect(encabezados).toContain('Cupo usado');
    expect(celdas[5]?.textContent.trim()).toBe('0');
    expect(texto).not.toContain('Duración');
    expect(texto).not.toContain('Modalidad');
    expect(texto).not.toContain('Observaciones');
    expect(fixture.nativeElement.querySelector('table')).toBeTruthy();
  });

  it('muestra las acciones a la izquierda con su tooltip', () => {
    const encabezados = Array.from(
      fixture.nativeElement.querySelectorAll('th') as NodeListOf<HTMLTableCellElement>,
    ).map((encabezado) => encabezado.textContent.trim());
    const acciones = Array.from(
      fixture.nativeElement.querySelectorAll('tbody button, tbody a') as NodeListOf<HTMLElement>,
    );

    expect(encabezados[0]).toBe('Acciones');
    expect(acciones.map((accion) => accion.getAttribute('title'))).toEqual([
      'Agregar asistente',
      'Registrar asistencia',
      'Editar la programación de la pedagogía',
    ]);
  });

  it('abre el registro de asistencia en una nueva pestaña con el id de la pedagogía', () => {
    const enlace = fixture.nativeElement.querySelector(
      'a[title="Registrar asistencia"]',
    ) as HTMLAnchorElement | null;

    expect(enlace?.target).toBe('_blank');
    expect(enlace?.href).toContain(
      '/gestion-acceso-justicia/comparendo/pedagogia/4388/asistencia',
    );
  });
});
