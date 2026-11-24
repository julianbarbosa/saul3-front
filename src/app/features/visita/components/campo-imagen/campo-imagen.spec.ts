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

  it('sin imagen no ofrece editar', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Editar imagen');
  });

  it('con imagen guardada ofrece editar y emite el evento', () => {
    fixture.componentRef.setInput('urlGuardada', 'http://localhost/api/visita/documento/a.jpg');
    fixture.detectChanges();
    let veces = 0;
    component.editar.subscribe(() => veces++);

    const boton = Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Editar imagen'),
    );
    boton?.click();

    expect(boton).toBeTruthy();
    expect(veces).toBe(1);
  });

  it('en modo observación no ofrece editar', () => {
    fixture.componentRef.setInput('urlGuardada', 'http://localhost/api/visita/documento/a.jpg');
    fixture.componentRef.setInput('bloqueado', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Editar imagen');
  });

  it('en modo observación no muestra ningún botón para cambiar la imagen', () => {
    fixture.componentRef.setInput('bloqueado', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('input[type="file"]').length).toBe(0);
  });
});
