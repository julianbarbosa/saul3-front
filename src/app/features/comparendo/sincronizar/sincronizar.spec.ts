import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { Sincronizar } from './sincronizar';

describe('Sincronizar', () => {
  let component: Sincronizar;
  let fixture: ComponentFixture<Sincronizar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Sincronizar],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Sincronizar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});