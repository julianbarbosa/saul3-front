import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListaComparendosComponent } from './lista-comparendos.component';

describe('ListaComparendosComponent', () => {
  let component: ListaComparendosComponent;
  let fixture: ComponentFixture<ListaComparendosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ListaComparendosComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListaComparendosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
