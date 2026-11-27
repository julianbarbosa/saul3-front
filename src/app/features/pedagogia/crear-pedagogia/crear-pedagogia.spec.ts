import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { PedagogiaService } from '../../../core/services/pedagogia.service';
import { CrearPedagogia } from './crear-pedagogia';

describe('CrearPedagogia', () => {
  let fixture: ComponentFixture<CrearPedagogia>;
  let listarComportamientosContrarios: ReturnType<typeof vi.fn>;
  let crearPedagogia: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    listarComportamientosContrarios = vi.fn().mockReturnValue(
      of([
        { id: 459, descripcion: 'Acuerdo de Pago' },
        { id: 199, descripcion: 'Art. 88 Servicio de baño' },
      ]),
    );
    crearPedagogia = vi.fn().mockReturnValue(
      of({ success: true, message: 'Pedagogía creada correctamente.', data: null }),
    );

    await TestBed.configureTestingModule({
      imports: [CrearPedagogia],
      providers: [
        provideRouter([]),
        {
          provide: PedagogiaService,
          useValue: { listarComportamientosContrarios, crearPedagogia },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CrearPedagogia);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('carga y muestra los comportamientos con un filtro por palabra clave', () => {
    const componente = fixture.componentInstance;
    const filtro = fixture.nativeElement.querySelector(
      '#buscar-comportamiento',
    ) as HTMLInputElement;

    expect(listarComportamientosContrarios).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.textContent).toContain('Acuerdo de Pago');
    expect(fixture.nativeElement.textContent).toContain('Art. 88 Servicio de baño');

    filtro.value = 'baño';
    filtro.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(componente.totalFiltrado()).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Art. 88 Servicio de baño');
    expect(fixture.nativeElement.textContent).not.toContain('Acuerdo de Pago');
  });

  it('crea pedagogía con los comportamientos seleccionados', () => {
    const componente = fixture.componentInstance;
    componente.formulario.setValue({
      nombre: 'Pedagogía sobre convivencia ciudadana',
      descripcion: 'Actividad para fortalecer la convivencia.',
      tipo: 'Pedagogía',
    });
    componente.seleccionados.set(new Set([459, 199]));

    componente.guardar();

    expect(crearPedagogia).toHaveBeenCalledWith({
      tipo: 'Pedagogía',
      nombre: 'Pedagogía sobre convivencia ciudadana',
      descripcion: 'Actividad para fortalecer la convivencia.',
      comportamientosIds: [459, 199],
    });
    expect(componente.resultado()?.tipo).toBe('exito');
  });

  it('no envía el formulario cuando faltan datos obligatorios', () => {
    fixture.componentInstance.guardar();

    expect(crearPedagogia).not.toHaveBeenCalled();
    expect(fixture.componentInstance.formularioEnviado()).toBe(true);
  });
});
