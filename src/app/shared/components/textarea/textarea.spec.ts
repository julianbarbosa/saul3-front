import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Textarea } from './textarea';

describe('Textarea', () => {
  let fixture: ComponentFixture<Textarea>;
  let component: Textarea;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Textarea] }).compileComponents();
    fixture = TestBed.createComponent(Textarea);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('label', 'Observaciones');
    fixture.componentRef.setInput('id', 'obs');
    fixture.componentRef.setInput('value', 'línea 1\nlínea 2');
    fixture.detectChanges();
  });

  function cuadro(): HTMLTextAreaElement {
    return fixture.nativeElement.querySelector('textarea');
  }

  function altoContenido(alto: number): void {
    Object.defineProperty(cuadro(), 'scrollHeight', { configurable: true, get: () => alto });
  }

  it('pinta un textarea de tres filas asociado a su etiqueta', () => {
    expect(cuadro().id).toBe('obs');
    expect(cuadro().rows).toBe(3);
    expect(cuadro().value).toBe('línea 1\nlínea 2');
    expect(fixture.nativeElement.querySelector('label[for="obs"]')?.textContent).toContain(
      'Observaciones',
    );
  });

  it('emite el valor y blurred al perder el foco', () => {
    const valores: string[] = [];
    let salidas = 0;
    component.valueChange.subscribe((valor) => valores.push(valor));
    component.blurred.subscribe(() => (salidas += 1));

    cuadro().value = 'texto nuevo';
    cuadro().dispatchEvent(new Event('blur'));

    expect(valores).toEqual(['texto nuevo']);
    expect(salidas).toBe(1);
  });

  it('no emite nada en solo lectura y sigue mostrando el cuadro', () => {
    fixture.componentRef.setInput('readOnly', true);
    fixture.detectChanges();
    let emitidos = 0;
    component.valueChange.subscribe(() => (emitidos += 1));
    component.blurred.subscribe(() => (emitidos += 1));

    cuadro().dispatchEvent(new Event('blur'));

    expect(cuadro().readOnly).toBe(true);
    expect(cuadro().rows).toBe(3);
    expect(emitidos).toBe(0);
  });

  it('crece con el contenido al escribir y se limita a 320px con scroll', () => {
    altoContenido(150);
    cuadro().dispatchEvent(new Event('input'));
    expect(cuadro().style.height).toBe('150px');
    expect(cuadro().style.overflowY).toBe('hidden');

    altoContenido(900);
    cuadro().dispatchEvent(new Event('input'));
    expect(cuadro().style.height).toBe('320px');
    expect(cuadro().style.overflowY).toBe('auto');
  });

  it('ajusta el alto cuando cambia el valor, también en solo lectura', () => {
    fixture.componentRef.setInput('readOnly', true);
    altoContenido(600);
    fixture.componentRef.setInput('value', 'texto muy largo');
    fixture.detectChanges();

    expect(cuadro().value).toBe('texto muy largo');
    expect(cuadro().style.height).toBe('320px');
    expect(cuadro().style.overflowY).toBe('auto');
  });

  it('oculta la etiqueta solo visualmente', () => {
    fixture.componentRef.setInput('ocultarEtiqueta', true);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('label')?.classList.contains('campo-etiqueta--oculta'),
    ).toBe(true);
  });

  describe('estados KIT UI SAUL3', () => {
    const error = (): HTMLElement | null =>
      fixture.nativeElement.querySelector('.campo__mensaje-error');
    const pintar = async (): Promise<void> => {
      fixture.detectChanges();
      await fixture.whenStable();
    };

    it('obligatorio vacío: error al salir; con texto: éxito', async () => {
      fixture.componentRef.setInput('value', '');
      fixture.componentRef.setInput('required', true);
      await pintar();
      expect(fixture.nativeElement.querySelector('.campo__requerido')).not.toBeNull();

      cuadro().dispatchEvent(new Event('blur'));
      await pintar();
      expect(error()?.textContent?.trim()).toBe('Campo requerido*');

      cuadro().value = 'Se observa obra en curso';
      cuadro().dispatchEvent(new Event('input'));
      await pintar();
      expect(error()).toBeNull();
      expect(fixture.nativeElement.querySelector('.campo--exito')).not.toBeNull();
    });
  });
});
