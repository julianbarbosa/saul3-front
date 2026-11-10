import { NgTemplateOutlet } from '@angular/common';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import type { Options as OpcionesPopper } from '@popperjs/core';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  signal,
  SimpleChanges,
  TemplateRef,
} from '@angular/core';
import { firstValueFrom, isObservable, Observable } from 'rxjs';

export interface FiltroColumnaEvento {
  campo: string;
  valor: string;
}

export interface OpcionFiltro {
  label: string;
  value: string | number;
}

export interface OpcionColumna {
  id: string | number;
  nombre: string;
}

export type TypeaheadSearchFn = (
  termino: string,
) =>
  | readonly Record<string, unknown>[]
  | Promise<readonly Record<string, unknown>[]>
  | Observable<readonly Record<string, unknown>[]>;

export type TypeaheadResolveFn = (
  valor: string | number,
) => string | null | Promise<string | null> | Observable<string | null>;

/** Filtro superior (texto, lista o búsqueda con sugerencias). */
export interface FiltroTabla {
  label: string;
  campo: string;
  tipo: string;
  value: unknown;
  placeholder?: string;
  options?: OpcionFiltro[];
  requiredMayusculas?: boolean;
  className?: string;
  searchFn?: TypeaheadSearchFn;
  resolveFn?: TypeaheadResolveFn;
  typeaheadOptions?: readonly unknown[];
  valueKey?: string;
  displayKeys?: string[];
  minSearchLength?: number;
}

/** Columna del listado. El filtro de cabecera es opcional. */
export interface ColumnaTabla {
  label?: string;
  titulo?: string;
  campo?: string | null;
  className?: string;
  width?: string;
  iconoFiltro?: boolean;
  activateFilter?: boolean;
  tipoFiltro?: string;
  opciones?: unknown[];
  options?: unknown[];
  filtroPlaceholder?: string;
  valorInicial?: unknown;
  toHtml?: boolean;
  /**
   * Plantilla propia para la celda (botones, enlaces). Recibe la fila como `$implicit`.
   * Si viene, tiene prioridad sobre `toHtml` y el texto plano.
   */
  template?: TemplateRef<{ $implicit: any }>;
  /** La cabecera se puede pulsar para ordenar por `campo` (el orden lo hace quien consulta). */
  sortable?: boolean;
  /**
   * Nombre con el que el backend filtra y ordena esta columna, cuando no es el mismo
   * dato de la fila (ej. la fila trae `supervisor` y saul2 filtra por `revisor`).
   */
  campoConsulta?: string;
}

export type DireccionOrden = 'ASC' | 'DESC';

export interface OrdenTablaEvento {
  campo: string;
  direccion: DireccionOrden;
}

/**
 * Tabla reutilizable para listados con filtros superiores, filtro por columna
 * y paginación. Es solo presentación: no llama APIs. El contenedor arma
 * `columns`, `data` y `filters` y reacciona a las salidas.
 */
@Component({
  selector: 'app-table',
  imports: [NgTemplateOutlet, NgbPopover],
  templateUrl: './table.html',
  styleUrl: './table.css',
})
export class Table implements OnChanges, AfterViewInit, OnDestroy {
  @Input() filters: FiltroTabla[] = [];
  @Input() data: unknown[] | null = null;
  @Input() columns: ColumnaTabla[] = [];
  @Input() total = 0;
  @Input() page = 1;
  @Input() pageSize = 10;
  @Input() pageSizeOptions: number[] = [10, 20, 50, 100];
  @Input() styleFilters = 'col-md-2';
  @Input() textoRegistros = 'registros';
  @Input() textoMostrar = 'Mostrar';
  @Input() mostrarEnlaceRelacionar = false;
  @Input() mostrarBotonLimpiar = true;
  @Input() mostrarBotonAplicar = true;
  @Input() mostrarBotonEditar = false;
  @Input() editFilter = false;
  /** Primera columna con checkbox por fila y “seleccionar página” en cabecera. */
  @Input() showCheckboxes = false;
  /** Campo del objeto fila usado como identificador de selección (p. ej. `id`). */
  @Input() rowIdField = 'id';
  /** Columna por la que está ordenado el listado (solo pinta el indicador). */
  @Input() sortBy: string | null = null;
  @Input() sortDir: DireccionOrden = 'ASC';
  /** Clase CSS opcional por fila (ej. `table-danger`). */
  @Input() rowClass: ((row: any) => string | null) | null = null;

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();
  @Output() filtersApply = new EventEmitter<FiltroTabla[]>();
  @Output() filtersUpdate = new EventEmitter<Record<string, string>>();

  /** Emite el filtro atómico: qué columna cambió y su nuevo valor. */
  @Output() filtroColumna = new EventEmitter<FiltroColumnaEvento>();

  /**
   * Emite el estado completo de todos los filtros activos.
   * Los campos sin valor se excluyen.
   */
  @Output() filtersChange = new EventEmitter<{
    filter: Record<string, string>;
    page: number;
    pageSize: number;
    cleanFilters?: boolean;
  }>();

  /** IDs de filas seleccionadas (persisten al cambiar de página). */
  @Output() selectionChange = new EventEmitter<string[]>();

  /** Clic en el botón Editar de la barra de filtros. */
  @Output() editClick = new EventEmitter<void>();

  /** Clic en el enlace Relacionar de la paginación superior. */
  @Output() relacionarClick = new EventEmitter<void>();

  /** Clic en una cabecera `sortable`: misma columna alterna ASC/DESC; otra columna empieza en ASC. */
  @Output() sortChange = new EventEmitter<OrdenTablaEvento>();

  paginas: number[] = [];

  /**
   * true cuando la tabla no cabe sin partir palabras: se muestra como tarjetas.
   * Lo decide la medición real (ver `evaluarModo`), no un ancho fijo, así funciona
   * con cualquier cantidad de columnas, con el menú abierto o con zoom.
   */
  readonly modoTarjetas = signal(false);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private observadorTamano: ResizeObserver | null = null;
  /** Ancho que necesitó la tabla la última vez que no cupo. */
  private anchoNecesario = 0;
  private medicionPendiente: number | null = null;
  totalPaginas = 1;
  defaultFilter: FiltroTabla[] = [];

  private readonly textosTypeahead = signal<Record<string, string>>({});
  private readonly sugerenciasTypeaheadEstado = signal<Record<string, Record<string, unknown>[]>>({});
  private readonly typeaheadAbiertoEstado = signal<Record<string, boolean>>({});

  /** Estado interno de los filtros de columna. */
  private _activeFilters: Record<string, string> = {};
  private readonly _selectedRowKeys = new Set<string>();
  /** Espera entre teclas antes de notificar el filtro de texto. */
  private readonly inputFilterDelayMs = 2000;
  /** Pausa tras la última tecla en el filtro de una columna (tarjeta del embudo). */
  private readonly filtroColumnaDelayMs = 600;
  private filtroColumnaTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Posición de la tarjeta del filtro como en el KIT: alineada al inicio de la columna,
   * un poco a la derecha, y montada unos 10px sobre el borde inferior del encabezado.
   */
  readonly ajustePopover = (opciones: Partial<OpcionesPopper>): Partial<OpcionesPopper> => ({
    ...opciones,
    modifiers: [...(opciones.modifiers ?? []), { name: 'offset', options: { offset: [10, -10] } }],
  });
  private inputFilterTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly busquedaTypeahead = new Map<string, number>();
  private readonly cierreTypeahead = new Map<string, ReturnType<typeof setTimeout>>();
  private vivo = true;

  get rangoDesde(): number {
    return (this.page - 1) * this.pageSize + 1;
  }

  get rangoHasta(): number {
    return Math.min(this.page * this.pageSize, this.total);
  }

  get colspanTabla(): number {
    return this.columns.length + (this.showCheckboxes ? 1 : 0);
  }

  get allRowsOnPageSelected(): boolean {
    const rows = this.data ?? [];
    if (!rows.length) {
      return false;
    }
    return rows.every((row) => this.isRowSelected(row));
  }

  get hayFilasSeleccionadas(): boolean {
    return this._selectedRowKeys.size > 0;
  }

  get usaLayoutFijo(): boolean {
    if (this.showCheckboxes) {
      return true;
    }
    return this.columns.some((column) => this.getColumnWidth(column) != null);
  }

  ngAfterViewInit(): void {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    this.observadorTamano = new ResizeObserver(() => this.evaluarModo());
    this.observadorTamano.observe(this.host.nativeElement);
    this.reevaluarModo();
  }

  ngOnDestroy(): void {
    this.vivo = false;
    this.observadorTamano?.disconnect();
    this.cancelarFiltroColumnaTimer();
    if (this.medicionPendiente !== null) {
      cancelAnimationFrame(this.medicionPendiente);
    }
    this.cancelarInputFilterTimer();
    for (const timer of this.cierreTypeahead.values()) {
      clearTimeout(timer);
    }
    this.cierreTypeahead.clear();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filters']?.currentValue) {
      const incoming = changes['filters'].currentValue as FiltroTabla[];
      if (Array.isArray(incoming) && incoming.length > 0) {
        this.defaultFilter = this.cloneFilters(incoming);
        this.sincronizarTextosTypeahead(incoming);
      }
    }
    if (changes['columns']?.currentValue) {
      this.inicializarFiltrosColumnaPorDefecto(changes['columns'].currentValue as ColumnaTabla[]);
    }
    if (changes['total'] || changes['pageSize'] || changes['page']) {
      this.calcularPaginacion();
    }
    // Otros datos u otras columnas pueden necesitar otro ancho: se vuelve a medir.
    if (changes['data'] || changes['columns']) {
      this.reevaluarModo();
    }
  }

  /**
   * Muestra la tabla y la mide en el siguiente cuadro. Si su ancho real supera el espacio
   * disponible, pasa a tarjetas; desde tarjetas vuelve a tabla cuando el espacio alcanza.
   */
  private reevaluarModo(): void {
    if (!this.observadorTamano) {
      return;
    }
    this.modoTarjetas.set(false);
    this.anchoNecesario = 0;
    if (this.medicionPendiente !== null) {
      cancelAnimationFrame(this.medicionPendiente);
    }
    this.medicionPendiente = requestAnimationFrame(() => {
      this.medicionPendiente = null;
      this.evaluarModo();
    });
  }

  private evaluarModo(): void {
    const contenedor = this.host.nativeElement.querySelector<HTMLElement>('.table-scroll');
    const tabla = contenedor?.querySelector('table');
    if (!contenedor || !tabla) {
      return;
    }
    const disponible = contenedor.clientWidth;
    if (!this.modoTarjetas()) {
      const necesario = tabla.offsetWidth;
      if (necesario > disponible + 1) {
        this.anchoNecesario = necesario;
        this.modoTarjetas.set(true);
      }
      return;
    }
    if (this.anchoNecesario > 0 && disponible >= this.anchoNecesario) {
      this.modoTarjetas.set(false);
    }
  }

  /** Clave con la que se filtra y ordena en el backend: `campoConsulta` o, si no viene, `campo`. */
  claveConsulta(column: ColumnaTabla): string {
    return column.campoConsulta ?? (typeof column.campo === 'string' ? column.campo : '');
  }

  /** La columna muestra el embudo. */
  tieneFiltro(column: ColumnaTabla): boolean {
    return this.mostrarIconoFiltro(column) && column.activateFilter !== false && !!this.claveConsulta(column);
  }

  /** La columna tiene un filtro aplicado: el embudo queda relleno aunque la tarjeta esté cerrada. */
  filtroActivo(column: ColumnaTabla): boolean {
    return this.valorFiltroColumna(column).trim() !== '';
  }

  get cantidadFiltrosColumna(): number {
    return Object.values(this._activeFilters).filter((valor) => String(valor).trim() !== '').length;
  }

  esColumnaOrdenada(column: ColumnaTabla): boolean {
    return !!column.sortable && this.claveConsulta(column) === this.sortBy;
  }

  ariaOrden(column: ColumnaTabla): 'ascending' | 'descending' | null {
    if (!this.esColumnaOrdenada(column)) {
      return null;
    }
    return this.sortDir === 'ASC' ? 'ascending' : 'descending';
  }

  etiquetaOrden(column: ColumnaTabla): string {
    if (!this.esColumnaOrdenada(column)) {
      return `Ordenar por ${column.label}`;
    }
    const actual = this.sortDir === 'ASC' ? 'ascendente' : 'descendente';
    const siguiente = this.sortDir === 'ASC' ? 'descendente' : 'ascendente';
    return `Ordenado por ${column.label}, ${actual}. Cambiar a ${siguiente}`;
  }

  /** Al abrir la tarjeta, el cursor queda en su campo. */
  enfocarCampoFiltro(): void {
    setTimeout(() => {
      document.querySelector<HTMLElement>('.filtro-popover .tarjeta-filtro__campo')?.focus();
    });
  }

  /** Filtro de texto o número: se aplica cuando el usuario deja de escribir. */
  programarFiltroColumna(column: ColumnaTabla, valor: string): void {
    this.cancelarFiltroColumnaTimer();
    this.filtroColumnaTimer = setTimeout(() => {
      this.filtroColumnaTimer = null;
      this.aplicarSiCambio(column, valor);
    }, this.filtroColumnaDelayMs);
  }

  /** Enter: se aplica sin esperar. */
  aplicarFiltroColumnaYa(column: ColumnaTabla, valor: string): void {
    this.cancelarFiltroColumnaTimer();
    this.aplicarSiCambio(column, valor);
  }

  private aplicarSiCambio(column: ColumnaTabla, valor: string): void {
    const limpio = valor.trim();
    if (limpio === this.valorFiltroColumna(column).trim()) {
      return;
    }
    this.onFiltroColumna(this.claveConsulta(column), limpio);
  }

  private cancelarFiltroColumnaTimer(): void {
    if (this.filtroColumnaTimer !== null) {
      clearTimeout(this.filtroColumnaTimer);
      this.filtroColumnaTimer = null;
    }
  }

  ordenarPor(column: ColumnaTabla): void {
    const campo = this.claveConsulta(column);
    if (!column.sortable || !campo) {
      return;
    }
    const direccion: DireccionOrden = this.sortBy === campo && this.sortDir === 'ASC' ? 'DESC' : 'ASC';
    this.sortBy = campo;
    this.sortDir = direccion;
    this.sortChange.emit({ campo, direccion });
  }

  indicadorOrden(column: ColumnaTabla): string {
    if (!column.sortable) {
      return '';
    }
    if (this.claveConsulta(column) !== this.sortBy) {
      return '↕';
    }
    return this.sortDir === 'ASC' ? '▲' : '▼';
  }

  claseFila(row: unknown): string | null {
    return this.rowClass ? this.rowClass(row) : null;
  }

  calcularPaginacion(): void {
    this.totalPaginas = Math.max(1, Math.ceil(this.total / this.pageSize));
    const ventana = 2;
    const inicio = Math.max(1, this.page - ventana);
    const fin = Math.min(this.totalPaginas, this.page + ventana);
    this.paginas = Array.from({ length: fin - inicio + 1 }, (_, i) => inicio + i);
  }

  cambiarPagina(p: number): void {
    if (p < 1 || p > this.totalPaginas || p === this.page) return;
    this.page = p;
    this.pageChange.emit(this.page);
    this.filtersChange.emit({
      filter: { ...this._activeFilters, ...this._buildFiltrosSuperiores() },
      page: this.page,
      pageSize: this.pageSize,
    });
  }

  onPaginaAnterior(): void {
    this.cambiarPagina(this.page - 1);
  }

  onPaginaSiguiente(): void {
    this.cambiarPagina(this.page + 1);
  }

  onCambiarLimite(nuevoLimite: number): void {
    this.pageSize = nuevoLimite;
    this.onPageSizeChange();
  }

  onPageSizeChange(): void {
    this.page = 1;
    this.calcularPaginacion();
    this.pageSizeChange.emit(this.pageSize);
    this.pageChange.emit(1);
    this.filtersChange.emit({
      filter: { ...this._activeFilters, ...this._buildFiltrosSuperiores() },
      page: this.page,
      pageSize: this.pageSize,
    });
  }

  onEditar(): void {
    if (!this.hayFilasSeleccionadas) {
      return;
    }
    this.editClick.emit();
  }

  applyFilters(): void {
    this.cancelarInputFilterTimer();
    this.page = 1;
    this.filtersApply.emit(this.filters);
    this.filtersChange.emit({
      filter: { ...this._activeFilters, ...this._buildFiltrosSuperiores() },
      page: this.page,
      pageSize: this.pageSize,
    });
  }

  valorTextoFiltro(filter: FiltroTabla): string {
    return filter.value == null ? '' : String(filter.value);
  }

  onTextoFiltro(filter: FiltroTabla, valor: string): void {
    filter.value = filter.requiredMayusculas ? valor.toUpperCase() : valor;
    this.onInputFilterChange(filter);
  }

  onCambioSelectFiltro(filter: FiltroTabla, event: Event): void {
    const raw = (event.target as HTMLSelectElement).value;
    const opcion = (filter.options ?? []).find((option) => String(option.value) === raw);
    filter.value = opcion ? opcion.value : '';
    this.onSelectFilterChange();
  }

  onCambioLimite(event: Event): void {
    this.onCambiarLimite(Number((event.target as HTMLSelectElement).value));
  }

  /** Emite el mapa de filtros superiores al cambiar un select (p. ej. subgrupo). */
  onSelectFilterChange(): void {
    this.page = 1;
    this.filtersChange.emit({
      filter: { ...this._activeFilters, ...this._buildFiltrosSuperiores() },
      page: this.page,
      pageSize: this.pageSize,
    });
  }

  /** Typeahead: sincroniza `filter.value` y emite `filtersChange`. */
  onTypeaheadFilterChange(value: string | number | null, filter: FiltroTabla): void {
    filter.value = value == null || value === '' ? '' : value;
    if (filter.campo) {
      this.filtersUpdate.emit({
        [filter.campo]: value == null || value === '' ? '' : String(value),
      });
    }
    this.onSelectFilterChange();
  }

  getTypeaheadSearchFn(filter: FiltroTabla): TypeaheadSearchFn | undefined {
    return typeof filter.searchFn === 'function' ? filter.searchFn : undefined;
  }

  getTypeaheadResolveFn(filter: FiltroTabla): TypeaheadResolveFn | undefined {
    return typeof filter.resolveFn === 'function' ? filter.resolveFn : undefined;
  }

  getTypeaheadOptions(filter: FiltroTabla): Record<string, unknown>[] {
    const raw = filter.typeaheadOptions ?? filter.options;
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw.map((entry) => this.mapTypeaheadOption(entry));
  }

  getTypeaheadValueKey(filter: FiltroTabla): string {
    const key = filter.valueKey;
    return typeof key === 'string' && key.trim() ? key.trim() : 'id';
  }

  getTypeaheadDisplayKeys(filter: FiltroTabla): string[] {
    const keys = filter.displayKeys;
    if (Array.isArray(keys) && keys.every((k) => typeof k === 'string')) {
      return keys;
    }
    return ['nombre'];
  }

  getTypeaheadMinLength(filter: FiltroTabla): number {
    const min = filter.minSearchLength;
    return typeof min === 'number' && min >= 0 ? min : 1;
  }

  textoTypeahead(filter: FiltroTabla): string {
    return this.textosTypeahead()[filter.campo] ?? '';
  }

  sugerenciasTypeahead(filter: FiltroTabla): Record<string, unknown>[] {
    return this.sugerenciasTypeaheadEstado()[filter.campo] ?? [];
  }

  typeaheadVisible(filter: FiltroTabla): boolean {
    return this.typeaheadAbiertoEstado()[filter.campo] === true && this.sugerenciasTypeahead(filter).length > 0;
  }

  onTextoTypeahead(filter: FiltroTabla, texto: string): void {
    const visible = filter.requiredMayusculas ? texto.toUpperCase() : texto;
    this.textosTypeahead.update((estado) => ({ ...estado, [filter.campo]: visible }));
    this.typeaheadAbiertoEstado.update((estado) => ({ ...estado, [filter.campo]: true }));
    void this.buscarTypeahead(filter, visible);
  }

  abrirTypeahead(filter: FiltroTabla): void {
    this.cancelarCierreTypeahead(filter.campo);
    this.typeaheadAbiertoEstado.update((estado) => ({ ...estado, [filter.campo]: true }));
    void this.buscarTypeahead(filter, this.textoTypeahead(filter));
  }

  cerrarTypeahead(filter: FiltroTabla): void {
    this.cancelarCierreTypeahead(filter.campo);
    const timer = setTimeout(() => {
      this.cierreTypeahead.delete(filter.campo);
      this.typeaheadAbiertoEstado.update((estado) => ({ ...estado, [filter.campo]: false }));
    }, 200);
    this.cierreTypeahead.set(filter.campo, timer);
  }

  seleccionarTypeahead(filter: FiltroTabla, opcion: Record<string, unknown>): void {
    this.textosTypeahead.update((estado) => ({
      ...estado,
      [filter.campo]: this.etiquetaTypeahead(filter, opcion),
    }));
    this.typeaheadAbiertoEstado.update((estado) => ({ ...estado, [filter.campo]: false }));
    this.sugerenciasTypeaheadEstado.update((estado) => ({ ...estado, [filter.campo]: [] }));
    this.onTypeaheadFilterChange(this.valorOpcionTypeahead(filter, opcion), filter);
  }

  etiquetaTypeahead(filter: FiltroTabla, opcion: Record<string, unknown>): string {
    const partes = this.getTypeaheadDisplayKeys(filter)
      .map((key) => opcion[key])
      .filter((parte) => parte != null && String(parte).trim() !== '')
      .map((parte) => String(parte));
    if (partes.length > 0) {
      return partes.join(' ');
    }
    return String(opcion['nombre'] ?? opcion['label'] ?? '');
  }

  valorOpcionTypeahead(filter: FiltroTabla, opcion: Record<string, unknown>): string | number {
    const raw = opcion[this.getTypeaheadValueKey(filter)];
    if (typeof raw === 'number' || typeof raw === 'string') {
      return raw;
    }
    return raw == null ? '' : String(raw);
  }

  /**
   * Reinicia la espera en cada tecla y emite el mapa de filtros
   * solo cuando el usuario deja de escribir.
   */
  onInputFilterChange(filter?: FiltroTabla): void {
    if (filter?.requiredMayusculas && typeof filter.value === 'string') {
      filter.value = filter.value.toUpperCase();
    }
    this.cancelarInputFilterTimer();
    this.inputFilterTimer = setTimeout(() => {
      this.inputFilterTimer = null;
      this.page = 1;
      this.filtersChange.emit({
        filter: { ...this._activeFilters, ...this._buildFiltrosSuperiores() },
        page: this.page,
        pageSize: this.pageSize,
      });
    }, this.inputFilterDelayMs);
  }

  /**
   * [ngValue] compara por referencia/tipo. El valor del filtro suele ser string
   * ("1") y option.value un number (1); sin esto el select no muestra la opción.
   */
  isFilterSelectEmpty(value: unknown): boolean {
    if (value === null || value === undefined) {
      return true;
    }
    return String(value).trim() === '';
  }

  compareFilterValues(selected: unknown, option: unknown): boolean {
    const selectedEmpty = selected == null || selected === '';
    const optionEmpty = option == null || option === '';
    if (selectedEmpty || optionEmpty) {
      return selectedEmpty && optionEmpty;
    }
    return String(selected) === String(option);
  }

  cleanFilters(): void {
    this.cancelarInputFilterTimer();
    this.filters = this.cloneFilters(this.defaultFilter);
    this._activeFilters = {};
    this.textosTypeahead.set({});
    this.sugerenciasTypeaheadEstado.set({});
    this.typeaheadAbiertoEstado.set({});
    this.clearRowSelection();
    this.page = 1;
    this.calcularPaginacion();
    this.filtersChange.emit({ filter: {}, page: this.page, pageSize: this.pageSize, cleanFilters: true });
  }

  mostrarIconoFiltro(column: ColumnaTabla): boolean {
    if (column.iconoFiltro === false) {
      return false;
    }
    return column.campo != null && String(column.campo).length > 0;
  }

  tipoIconoFiltro(column: ColumnaTabla): 'input' | 'number' | 'select' | 'multiselect' {
    const opts = column.opciones ?? column.options;
    if (column.tipoFiltro === 'multiseleccion' && Array.isArray(opts) && opts.length > 0) {
      return 'multiselect';
    }
    if (column.tipoFiltro === 'seleccion') {
      return 'select';
    }
    if (column.tipoFiltro === 'numerico') {
      return 'number';
    }
    return 'input';
  }

  opcionesIconoFiltro(column: ColumnaTabla): OpcionColumna[] {
    const raw = column.opciones ?? column.options;
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw.map((o: unknown) => {
      if (o !== null && typeof o === 'object') {
        const obj = o as Record<string, unknown>;
        if ('id' in obj && 'nombre' in obj) {
          return { id: obj['id'] as string | number, nombre: String(obj['nombre']) };
        }
        if ('label' in obj && 'value' in obj) {
          return {
            id: obj['value'] as string | number,
            nombre: String(obj['label']),
          };
        }
      }
      return { id: o as string | number, nombre: String(o) };
    });
  }

  /**
   * `col-N` no define ancho en `<th>`/`<td>`.
   * Si `className` incluye `col-N`, devuelve el % equivalente (N/12).
   * También admite `column.width` directo (ej. `'120px'`, `'15%'`).
   */
  getColumnWidth(column: ColumnaTabla): string | null {
    const width = column.width;
    if (typeof width === 'string' && width.trim()) {
      return width.trim();
    }
    const className = column.className;
    if (typeof className !== 'string') {
      return null;
    }
    const match = className.match(/\bcol-(\d+)\b/);
    if (!match) {
      return null;
    }
    const cols = Number(match[1]);
    if (cols > 0 && cols <= 12) {
      return `${(cols / 12) * 100}%`;
    }
    return null;
  }

  getFilterNgClass(filter: FiltroTabla): string {
    const extra = filter.className;
    if (typeof extra === 'string' && extra.trim()) {
      return `${this.styleFilters} ${extra.trim()}`;
    }
    return this.styleFilters;
  }

  placeholderIconoFiltro(column: ColumnaTabla): string {
    const custom = column.filtroPlaceholder;
    if (typeof custom === 'string' && custom.trim()) {
      return custom;
    }
    const titulo = column.label ?? column.titulo ?? '';
    return `Filtrar por ${titulo}`;
  }

  valorInicialFiltro(column: ColumnaTabla): string {
    const inicial = column.valorInicial;
    if (inicial == null || inicial === '') return '';
    return String(inicial);
  }

  valorFiltroColumna(column: ColumnaTabla): string {
    const campo = this.claveConsulta(column);
    if (campo && campo in this._activeFilters) {
      return this._activeFilters[campo] ?? '';
    }
    return this.valorInicialFiltro(column);
  }

  /**
   * Actualiza el filtro de una columna.
   * Si el valor queda vacío, elimina la clave del mapa.
   */
  onFiltroColumna(campo: string, valor: string): void {
    if (valor.trim() === '') {
      delete this._activeFilters[campo];
    } else {
      this._activeFilters[campo] = valor;
    }

    this.page = 1;
    this.calcularPaginacion();
    this.filtroColumna.emit({ campo, valor });
    this.pageChange.emit(1);
    this.filtersChange.emit({
      filter: { ...this._activeFilters, ...this._buildFiltrosSuperiores() },
      page: this.page,
      pageSize: this.pageSize,
    });
  }

  onMultiselectColumna(column: ColumnaTabla, event: Event): void {
    const seleccion = Array.from((event.target as HTMLSelectElement).selectedOptions).map((opcion) => opcion.value);
    this.onFiltroColumna(this.claveConsulta(column), seleccion.join(','));
  }

  multiselectMarcada(column: ColumnaTabla, id: string | number): boolean {
    return this.valorFiltroColumna(column)
      .split(',')
      .filter((parte) => parte !== '')
      .includes(String(id));
  }

  /**
   * Limpia todos los filtros de columna y notifica al padre.
   */
  clearColumnFilters(): void {
    this.cancelarInputFilterTimer();
    this.cancelarFiltroColumnaTimer();
    this._activeFilters = {};
    // Primero la página 1: antes se emitía la página anterior y la consulta podía quedar vacía.
    this.page = 1;
    this.calcularPaginacion();
    this.pageChange.emit(1);
    this.filtersChange.emit({
      filter: { ...this._buildFiltrosSuperiores() },
      page: this.page,
      pageSize: this.pageSize,
    });
  }

  formatCell(row: unknown, campo: string | null): string {
    if (!campo || row == null || typeof row !== 'object') return '';
    const valor = (row as Record<string, unknown>)[campo] ?? '';
    return String(valor).replace(/\//g, '/ ');
  }

  cellHtml(row: unknown, campo: string | null): string {
    if (!campo || row == null || typeof row !== 'object') {
      return '';
    }
    const valor = (row as Record<string, unknown>)[campo] ?? '';
    return String(valor);
  }

  isRowSelected(row: unknown): boolean {
    const key = this.rowSelectionKey(row);
    return key != null && this._selectedRowKeys.has(key);
  }

  onRowCheckboxChange(row: unknown, checked: boolean): void {
    const key = this.rowSelectionKey(row);
    if (key == null) {
      return;
    }
    if (checked) {
      this._selectedRowKeys.add(key);
    } else {
      this._selectedRowKeys.delete(key);
    }
    this.emitSelectionChange();
  }

  onToggleAllOnPageChange(checked: boolean): void {
    for (const row of this.data ?? []) {
      const key = this.rowSelectionKey(row);
      if (key == null) {
        continue;
      }
      if (checked) {
        this._selectedRowKeys.add(key);
      } else {
        this._selectedRowKeys.delete(key);
      }
    }
    this.emitSelectionChange();
  }

  clearRowSelection(): void {
    if (this._selectedRowKeys.size === 0) {
      return;
    }
    this._selectedRowKeys.clear();
    this.emitSelectionChange();
  }

  rowSelectionKey(row: unknown): string | null {
    if (row == null || typeof row !== 'object') {
      return null;
    }
    const raw = (row as Record<string, unknown>)[this.rowIdField];
    if (raw === null || raw === undefined || raw === '') {
      return null;
    }
    return String(raw);
  }

  casillaMarcada(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }

  valorInput(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  private mapTypeaheadOption(entry: unknown): Record<string, unknown> {
    if (entry !== null && typeof entry === 'object') {
      const obj = entry as Record<string, unknown>;
      if ('label' in obj && 'value' in obj) {
        return {
          ...obj,
          id: obj['value'],
          nombre: String(obj['label'] ?? ''),
        };
      }
      return { ...obj };
    }
    return { id: entry, nombre: String(entry) };
  }

  private inicializarFiltrosColumnaPorDefecto(columns: ColumnaTabla[]): void {
    for (const col of columns) {
      const campo = this.claveConsulta(col);
      const inicial = col.valorInicial;
      if (
        campo &&
        inicial != null &&
        String(inicial).trim() !== '' &&
        !(campo in this._activeFilters)
      ) {
        this._activeFilters[campo] = String(inicial);
      }
    }
  }

  private cancelarInputFilterTimer(): void {
    if (this.inputFilterTimer == null) {
      return;
    }
    clearTimeout(this.inputFilterTimer);
    this.inputFilterTimer = null;
  }

  /** Copia los filtros para no compartir referencia con el estado editado en el formulario. */
  private cloneFilters(source: FiltroTabla[]): FiltroTabla[] {
    return source.map((f) => ({
      ...f,
      value: this.cloneFilterValue(f.value),
    }));
  }

  private cloneFilterValue(value: unknown): unknown {
    if (Array.isArray(value)) {
      return [...value];
    }
    return value;
  }

  private _buildFiltrosSuperiores(): Record<string, string> {
    return this.filters
      .filter((f) => f.value != null && String(f.value).trim() !== '')
      .reduce<Record<string, string>>((acc, f) => {
        acc[f.campo] = String(f.value);
        return acc;
      }, {});
  }

  private emitSelectionChange(): void {
    this.selectionChange.emit([...this._selectedRowKeys]);
  }

  private sincronizarTextosTypeahead(filters: FiltroTabla[]): void {
    for (const filter of filters) {
      if (filter.tipo !== 'input-typeahead') {
        continue;
      }
      if (this.textosTypeahead()[filter.campo] != null) {
        continue;
      }
      const valor = filter.value;
      if (valor == null || valor === '') {
        continue;
      }
      void this.resolverEtiquetaTypeahead(filter, valor).then((etiqueta) => {
        if (!this.vivo || this.textosTypeahead()[filter.campo] != null) {
          return;
        }
        this.textosTypeahead.update((estado) => ({ ...estado, [filter.campo]: etiqueta }));
      });
    }
  }

  private async resolverEtiquetaTypeahead(filter: FiltroTabla, valor: unknown): Promise<string> {
    if (typeof valor !== 'string' && typeof valor !== 'number') {
      return String(valor);
    }
    const resolveFn = this.getTypeaheadResolveFn(filter);
    if (!resolveFn) {
      return String(valor);
    }
    try {
      const resultado = resolveFn(valor);
      const etiqueta = isObservable(resultado) ? await firstValueFrom(resultado) : await resultado;
      return etiqueta ?? String(valor);
    } catch {
      return String(valor);
    }
  }

  private async buscarTypeahead(filter: FiltroTabla, texto: string): Promise<void> {
    const actual = (this.busquedaTypeahead.get(filter.campo) ?? 0) + 1;
    this.busquedaTypeahead.set(filter.campo, actual);
    const min = this.getTypeaheadMinLength(filter);
    if (texto.trim().length < min) {
      this.sugerenciasTypeaheadEstado.update((estado) => ({ ...estado, [filter.campo]: [] }));
      return;
    }
    const lista = await this.consultarTypeahead(filter, texto);
    if (!this.vivo || this.busquedaTypeahead.get(filter.campo) !== actual) {
      return;
    }
    this.sugerenciasTypeaheadEstado.update((estado) => ({ ...estado, [filter.campo]: lista }));
  }

  private async consultarTypeahead(filter: FiltroTabla, texto: string): Promise<Record<string, unknown>[]> {
    try {
      const searchFn = this.getTypeaheadSearchFn(filter);
      const crudo = searchFn ? await this.resolverBusqueda(searchFn(texto)) : this.filtrarOpcionesLocales(filter, texto);
      return [...crudo].map((entry) => this.mapTypeaheadOption(entry));
    } catch {
      return [];
    }
  }

  private filtrarOpcionesLocales(filter: FiltroTabla, texto: string): Record<string, unknown>[] {
    const termino = texto.trim().toLowerCase();
    return this.getTypeaheadOptions(filter).filter((opcion) =>
      this.etiquetaTypeahead(filter, opcion).toLowerCase().includes(termino),
    );
  }

  private async resolverBusqueda(
    resultado:
      | readonly Record<string, unknown>[]
      | Promise<readonly Record<string, unknown>[]>
      | Observable<readonly Record<string, unknown>[]>,
  ): Promise<readonly Record<string, unknown>[]> {
    if (isObservable(resultado)) {
      return await firstValueFrom(resultado);
    }
    return await resultado;
  }

  private cancelarCierreTypeahead(campo: string): void {
    const timer = this.cierreTypeahead.get(campo);
    if (timer == null) {
      return;
    }
    clearTimeout(timer);
    this.cierreTypeahead.delete(campo);
  }
}
