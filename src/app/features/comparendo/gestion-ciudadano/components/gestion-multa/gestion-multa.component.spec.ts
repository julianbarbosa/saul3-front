import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { GestionMultaComponent } from './gestion-multa.component';

describe('GestionMultaComponent', () => {
  let component: GestionMultaComponent;
  let fixture: ComponentFixture<GestionMultaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GestionMultaComponent],
      imports: [HttpClientTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(GestionMultaComponent);
    component = fixture.componentInstance;
    component.comparendoId = 1;
    component.numeroIdentificacion = '123456789';
    component.valorBase = 100000;
    component.fechaProntoPago = '2026-12-31';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
