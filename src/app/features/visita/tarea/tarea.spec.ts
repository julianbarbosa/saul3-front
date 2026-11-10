import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { VisitaService } from '../../../core/services/visita.service';
import { Tarea } from './tarea';

describe('Tarea', () => {
  let component: Tarea;
  let fixture: ComponentFixture<Tarea>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Tarea],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        {
          provide: VisitaService,
          useValue: {
            listarTareas: () => of({ success: true, data: [], totalItems: 0 }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Tarea);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
