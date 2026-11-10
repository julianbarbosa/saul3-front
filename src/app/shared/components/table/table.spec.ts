import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { Table } from './table';

describe('Table', () => {
  let component: Table;
  let fixture: ComponentFixture<Table>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Table],
    }).compileComponents();

    fixture = TestBed.createComponent(Table);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('se crea', () => {
    expect(component).toBeTruthy();
  });

  it('muestra un input por cada filtro de texto', async () => {
    // setInput (no asignar la propiedad): así Angular corre ngOnChanges y una sola detección de cambios.
    fixture.componentRef.setInput('filters', [{ campo: 'nombre', label: 'Nombre', tipo: 'input', value: '' }]);
    fixture.detectChanges();
    await fixture.whenStable();

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement | null;
    expect(input).toBeTruthy();
    expect(input?.getAttribute('placeholder')).toBe('Nombre');
  });

  it('emite filtersChange con el mapa de filtros superiores', () => {
    const emitSpy = vi.spyOn(component.filtersChange, 'emit');
    component.filters = [
      {
        campo: 'subgrupoId',
        label: 'Subgrupo',
        tipo: 'select',
        value: 1,
        options: [{ label: 'Herbicida', value: 1 }],
      },
      {
        campo: 'funcionEspecificaId',
        label: 'Función',
        tipo: 'select',
        value: '',
        options: [],
      },
    ];

    component.onSelectFilterChange();

    expect(emitSpy).toHaveBeenCalledWith({
      filter: { subgrupoId: '1' },
      page: 1,
      pageSize: component.pageSize,
    });
  });

  it('emite filtersChange de un input 2 segundos después de la última tecla', () => {
    vi.useFakeTimers();
    try {
      const emitSpy = vi.spyOn(component.filtersChange, 'emit');
      component.filters = [{ campo: 'nombreComercial', label: 'Nombre', tipo: 'input', value: 'AB' }];

      component.onInputFilterChange();
      component.filters[0]!.value = 'ABC';
      component.onInputFilterChange();

      vi.advanceTimersByTime(1999);
      expect(emitSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(emitSpy).toHaveBeenCalledTimes(1);
      expect(emitSpy).toHaveBeenCalledWith({
        filter: { nombreComercial: 'ABC' },
        page: 1,
        pageSize: component.pageSize,
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('ordenarPor alterna ASC/DESC en la misma columna y vuelve a ASC al cambiar', () => {
    const emitSpy = vi.spyOn(component.sortChange, 'emit');
    const id = { label: 'No', campo: 'idvisita', sortable: true };
    const dir = { label: 'Dirección', campo: 'direccion', sortable: true };

    component.ordenarPor(id);
    component.ordenarPor(id);
    component.ordenarPor(dir);
    component.ordenarPor({ label: 'Sin orden', campo: 'x' });

    expect(emitSpy.mock.calls.map((c) => c[0])).toEqual([
      { campo: 'idvisita', direccion: 'ASC' },
      { campo: 'idvisita', direccion: 'DESC' },
      { campo: 'direccion', direccion: 'ASC' },
    ]);
    expect(component.indicadorOrden(dir)).toBe('▲');
    expect(component.indicadorOrden(id)).toBe('↕');
  });

  it('claseFila usa rowClass si viene', () => {
    expect(component.claseFila({ id: 1 })).toBeNull();
    component.rowClass = (row: { id: number }) => (row.id === 1 ? 'table-danger' : null);
    expect(component.claseFila({ id: 1 })).toBe('table-danger');
  });

  it('compara valores de select como string y number', () => {
    expect(component.compareFilterValues('1', 1)).toBe(true);
    expect(component.compareFilterValues('', 1)).toBe(false);
    expect(component.compareFilterValues('', '')).toBe(true);
  });

  describe('filtro por columna con embudo (KIT UI SAUL3)', () => {
    const columnas = [
      { label: 'Dirección', campo: 'direccion', sortable: true },
      { label: 'Revisor', campo: 'supervisor', campoConsulta: 'revisor', sortable: true },
      { label: 'Fecha', campo: 'fecha', activateFilter: false },
    ];

    beforeEach(async () => {
      fixture.componentRef.setInput('columns', columnas);
      fixture.componentRef.setInput('data', [{ id: 1, direccion: 'calle 1', supervisor: 'Ana' }]);
      fixture.componentRef.setInput('total', 30);
      fixture.detectChanges();
      await fixture.whenStable();
    });

    afterEach(() => vi.useRealTimers());

    it('muestra embudo y orden solo donde corresponde', () => {
      const raiz = fixture.nativeElement as HTMLElement;
      expect(raiz.querySelectorAll('.icono-filtro')).toHaveLength(2);
      expect(raiz.querySelectorAll('.icono-orden')).toHaveLength(2);
      expect(raiz.querySelectorAll('input.filtro-columna, select.filtro-columna')).toHaveLength(0);
    });

    it('usa campoConsulta para filtrar y ordenar (Revisor → revisor)', () => {
      const filtros = vi.spyOn(component.filtersChange, 'emit');
      const orden = vi.spyOn(component.sortChange, 'emit');
      component.aplicarFiltroColumnaYa(columnas[1], ' Ana ');
      expect(filtros).toHaveBeenLastCalledWith({ filter: { revisor: 'Ana' }, page: 1, pageSize: 10 });
      component.ordenarPor(columnas[1]);
      component.ordenarPor(columnas[1]);
      expect(orden).toHaveBeenLastCalledWith({ campo: 'revisor', direccion: 'DESC' });
      expect(component.ariaOrden(columnas[1])).toBe('descending');
    });

    it('el texto se aplica tras la pausa, una sola vez', () => {
      vi.useFakeTimers();
      const filtros = vi.spyOn(component.filtersChange, 'emit');
      component.programarFiltroColumna(columnas[0], 'ca');
      component.programarFiltroColumna(columnas[0], 'calle');
      vi.advanceTimersByTime(599);
      expect(filtros).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(filtros).toHaveBeenCalledTimes(1);
      expect(filtros).toHaveBeenLastCalledWith({ filter: { direccion: 'calle' }, page: 1, pageSize: 10 });
      expect(component.filtroActivo(columnas[0])).toBe(true);
      expect(component.cantidadFiltrosColumna).toBe(1);
    });

    it('no vuelve a consultar si el valor no cambió', () => {
      component.aplicarFiltroColumnaYa(columnas[0], 'calle');
      const filtros = vi.spyOn(component.filtersChange, 'emit');
      component.aplicarFiltroColumnaYa(columnas[0], 'calle ');
      expect(filtros).not.toHaveBeenCalled();
    });

    it('Limpiar filtros vuelve a la página 1 sin filtros', () => {
      component.aplicarFiltroColumnaYa(columnas[0], 'calle');
      component.page = 3;
      const filtros = vi.spyOn(component.filtersChange, 'emit');
      component.clearColumnFilters();
      expect(filtros).toHaveBeenLastCalledWith({ filter: {}, page: 1, pageSize: 10 });
      expect(component.cantidadFiltrosColumna).toBe(0);
    });
  });
});
