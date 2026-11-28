import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormViewer } from './form-viewer';
import { FormViewerField } from './form-viewer-field';
import {
  formatFormViewerFieldValue,
  isFormViewerValueEmpty,
  parseFormViewerFields,
} from './form-viewer-format';

describe('FormViewer', () => {
  let component: FormViewer;
  let fixture: ComponentFixture<FormViewer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormViewer],
    }).compileComponents();

    fixture = TestBed.createComponent(FormViewer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('se crea', () => {
    expect(component).toBeTruthy();
  });

  it('muestra etiquetas y valores con columnas Bootstrap', async () => {
    fixture.componentRef.setInput('fields', [
      { label: 'Expediente', value: '2026-00125', type: 'text', colMd: 4 },
      { label: 'Observaciones', value: 'OK', type: 'text', colMd: 12 },
    ] satisfies FormViewerField[]);
    fixture.detectChanges();
    await fixture.whenStable();

    const labels = Array.from(
      fixture.nativeElement.querySelectorAll('dt') as NodeListOf<HTMLElement>,
      (el) => el.textContent?.trim(),
    );
    expect(labels).toEqual(['Expediente', 'Observaciones']);

    const cols = fixture.nativeElement.querySelectorAll('.col-md-4, .col-md-12');
    expect(cols.length).toBe(2);
  });

  it('acepta configuración JSON por fieldsJson', async () => {
    fixture.componentRef.setInput(
      'fieldsJson',
      JSON.stringify([{ label: 'Estado', value: 'Activo', type: 'text', colMd: 6 }]),
    );
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Activo');
  });
});

describe('form-viewer-format', () => {
  it('trata 0 y false como valores presentes', () => {
    expect(isFormViewerValueEmpty(0)).toBe(false);
    expect(isFormViewerValueEmpty(false)).toBe(false);
    expect(
      formatFormViewerFieldValue({ label: 'n', value: 0, type: 'number' }),
    ).toBe('0');
    expect(
      formatFormViewerFieldValue({ label: 'n', value: false, type: 'boolean' }),
    ).toBe('No');
  });

  it('formatea fechas ISO sin desfase por zona horaria', () => {
    const formatted = formatFormViewerFieldValue({
      label: 'Fecha',
      value: '2026-11-27',
      type: 'date',
    });
    expect(formatted).toMatch(/27/);
    expect(formatted).toMatch(/11/);
    expect(formatted).toMatch(/2026/);
  });

  it('parsea arreglo JSON de campos', () => {
    const fields = parseFormViewerFields(
      '[{"label":"A","value":1,"type":"text","colMd":4}]',
    );
    expect(fields).toHaveLength(1);
    expect(fields[0].label).toBe('A');
  });
});