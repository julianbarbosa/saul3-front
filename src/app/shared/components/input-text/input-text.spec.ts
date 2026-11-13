import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InputText } from './input-text';

describe('InputText', () => {
  let component: InputText;
  let fixture: ComponentFixture<InputText>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InputText],
    }).compileComponents();

    fixture = TestBed.createComponent(InputText);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('estados KIT UI SAUL3', () => {
    const raiz = (): HTMLElement => fixture.nativeElement;
    const control = (): HTMLInputElement => raiz().querySelector('input')!;
    const error = (): HTMLElement | null => raiz().querySelector('.campo__mensaje-error');
    const pintar = async (): Promise<void> => {
      fixture.detectChanges();
      await fixture.whenStable();
    };

    beforeEach(async () => {
      fixture.componentRef.setInput('label', 'Nombre');
      fixture.componentRef.setInput('id', 'nombre');

      fixture.componentRef.setInput('required', true);
      await pintar();
    });

    it('muestra el asterisco y aria-required, sin error antes de tocar el campo', () => {
      expect(raiz().querySelector('.campo__requerido')).not.toBeNull();
      expect(control().getAttribute('aria-required')).toBe('true');
      expect(error()).toBeNull();
    });

    it('error al salir vacío y éxito al diligenciar', async () => {
      control().dispatchEvent(new Event('blur'));
      await pintar();
      expect(error()?.textContent?.trim()).toBe('Campo requerido*');
      expect(control().getAttribute('aria-invalid')).toBe('true');
      expect(control().getAttribute('aria-describedby')).toBe('nombre-error');

      control().value = 'Adriana';
      control().dispatchEvent(new Event('input'));
      await pintar();
      expect(error()).toBeNull();
      expect(raiz().querySelector('.campo--exito')).not.toBeNull();
    });

    it('validar fuerza el error sin tocar el campo', async () => {
      fixture.componentRef.setInput('validar', true);
      await pintar();
      expect(error()).not.toBeNull();
    });

    it('no valida campos de solo lectura', async () => {
      fixture.componentRef.setInput('readOnly', true);
      fixture.componentRef.setInput('validar', true);
      await pintar();
      expect(error()).toBeNull();
    });
  });
});
