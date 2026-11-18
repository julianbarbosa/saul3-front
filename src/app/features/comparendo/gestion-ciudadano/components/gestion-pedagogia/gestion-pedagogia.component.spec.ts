import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { GestionPedagogiaComponent } from './gestion-pedagogia.component';

describe('GestionPedagogiaComponent', () => {
  let component: GestionPedagogiaComponent;
  let fixture: ComponentFixture<GestionPedagogiaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GestionPedagogiaComponent],
      imports: [HttpClientTestingModule, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(GestionPedagogiaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
