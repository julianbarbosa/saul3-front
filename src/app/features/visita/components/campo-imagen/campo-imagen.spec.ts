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
});
