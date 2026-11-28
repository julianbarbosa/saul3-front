import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PageHeader } from './header';

describe('PageHeader', () => {
  let component: PageHeader;
  let fixture: ComponentFixture<PageHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageHeader],
    }).compileComponents();

    fixture = TestBed.createComponent(PageHeader);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('titulo', 'Título de prueba');
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('muestra solo subtitulo cuando titulo es null', async () => {
    fixture.componentRef.setInput('titulo', null);
    fixture.componentRef.setInput('subtitulo', 'Historial traslados');
    fixture.detectChanges();
    await fixture.whenStable();

    const raiz: HTMLElement = fixture.nativeElement;
    expect(raiz.querySelector('h1')).toBeNull();
    expect(raiz.querySelector('h2')?.textContent?.trim()).toBe('Historial traslados');
  });
});
