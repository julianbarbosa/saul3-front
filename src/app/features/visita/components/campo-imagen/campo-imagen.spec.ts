import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CampoImagen } from './campo-imagen';

describe('CampoImagen', () => {
  let component: CampoImagen;
  let fixture: ComponentFixture<CampoImagen>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CampoImagen],
    }).compileComponents();

    fixture = TestBed.createComponent(CampoImagen);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('campo', {
      id: 1,
      codigo: 'foto',
      tipo: 'imagen',
      soloLectura: false,
    });
    fixture.componentRef.setInput('etiqueta', 'Foto');
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ofrece tomar foto o seleccionar desde las carpetas, solo con imágenes', () => {
    fixture.detectChanges();
    const inputs: HTMLInputElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('input[type="file"]'),
    );
    const camara = inputs.find((input) => input.hasAttribute('capture'));
    const galeria = inputs.find((input) => !input.hasAttribute('capture'));

    expect(inputs.length).toBe(2);
    expect(camara?.getAttribute('capture')).toBe('environment');
    expect(galeria?.id).toBe('campo-1');
    for (const input of inputs) {
      expect(input.accept).toBe('.png,.jpeg,.jpg,image/png,image/jpeg');
    }
    expect(fixture.nativeElement.textContent).toContain('Tomar foto');
    expect(fixture.nativeElement.textContent).toContain('Seleccionar');
  });

  it('emite el cambio desde cualquiera de los dos botones', () => {
    fixture.detectChanges();
    const eventos: Event[] = [];
    component.archivoChange.subscribe((evento) => eventos.push(evento));

    for (const input of fixture.nativeElement.querySelectorAll('input[type="file"]')) {
      input.dispatchEvent(new Event('change'));
    }

    expect(eventos.length).toBe(2);
  });

  it('en modo observación no muestra ningún botón para cambiar la imagen', () => {
    fixture.componentRef.setInput('bloqueado', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('input[type="file"]').length).toBe(0);
  });
});
