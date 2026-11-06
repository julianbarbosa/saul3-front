import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetalleComparendoComponent } from './detalle-comparendo.component';

describe('DetalleComparendoComponent', () => {
  let component: DetalleComparendoComponent;
  let fixture: ComponentFixture<DetalleComparendoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DetalleComparendoComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DetalleComparendoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
