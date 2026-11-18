import {
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import {
  normalizarNombreCampo,
  resolverNombresObligatorios,
  tipoControlDesdeTexto,
} from '../../../core/constants/visita-campos-obligatorios';
import {
  BloquePresentacion,
  VisitaCampo,
  VisitaCategoria,
  UbicacionVisita,
  VisitaDetalle,
  VisitaEncabezado,
  VisitaTabla,
} from '../../../core/interfaces/visita.interface';
import { Barrio, CatastroService } from '../../../core/services/catastro.service';
import { FormatoTextoService } from '../../../core/services/formato-texto.service';
import { ValidadorImagenService } from '../../../core/services/validador-imagen.service';
import { VisitaLimpiaService } from '../../../core/services/visita-limpia.service';
import { aEncabezadoVisita, VisitaService } from '../../../core/services/visita.service';
import { Button } from '../../../shared/components/button/button';
import { InputText } from '../../../shared/components/input-text/input-text';
import { MapComponent } from '../../../shared/components/map/map';
import { Select } from '../../../shared/components/select/select';
import { Textarea } from '../../../shared/components/textarea/textarea';
import { SharedModule } from '../../../shared/shared-module';
import { CampoImagen } from '../components/campo-imagen/campo-imagen';
import { fechaParaInput, fechaParaSaul, horaParaInput, horaParaSaul } from './fecha-hora-visita';
import { configuracionVisita } from './configuracion-visita';

export type ModoVisualizacion = 'normal' | 'acordion' | 'horizontal';

/** Centro del mapa cuando la visita no trae coordenadas válidas (Cali, igual que `MapComponent`). */
const UBICACION_POR_DEFECTO: UbicacionVisita = { latitud: 3.4516, longitud: -76.5225 };

/** Id de la visita en gestión: no va en la URL; solo en `history.state` y sesión del tab. */
export const ID_VISITA_GESTION_SESION = 'ssj-visita-gestion-id';

interface ParRegistro {
  imagen: VisitaCampo;
  descripcion: VisitaCampo | null;
}

interface CeldaRegistro {
  campo: VisitaCampo;
  clase: string;
  salto: boolean;
}

/** Paso del modo Normal (KIT UI SAUL3, pág. 12): el Mapa y luego cada categoría. */
export interface PasoFormulario {
  id: number;
  nombre: string;
  categoria: VisitaCategoria | null;
}

export type EstadoPaso = 'actual' | 'hecho' | 'pendiente';

interface BloqueCampos {
  id: number;
  filas: CeldaRegistro[][];
  campos: VisitaCampo[];
}

@Component({
  selector: 'app-gestion',
  imports: [SharedModule, Button, CampoImagen, InputText, MapComponent, Select, Textarea],
  templateUrl: './gestion.html',
  styleUrl: './gestion.css',
})
export class Gestion implements OnInit, OnDestroy {
  /** Id reservado para la categoría fija «Mapa» (no viene del API). */
  readonly categoriaMapaId = 0;
  readonly categoriaMapaNombre = 'Mapa';

  /** Estructura del formulario con sus valores (GET /visita/generar/{id}). */
  readonly dataForm = signal<VisitaCategoria[]>([]);
  /** Datos generales de la visita (GET /visita/{id}). null mientras carga o si falla. */
  readonly visitaDetalle = signal<VisitaDetalle | null>(null);
  /** Encabezado «Registro de Visita»: se recalcula solo cuando cambia `visitaDetalle`. */
  readonly encabezado = computed<VisitaEncabezado | null>(() => {
    const visita = this.visitaDetalle();
    return visita ? aEncabezadoVisita(visita) : null;
  });
  /** Ubicación real de la visita (null si no trae coordenadas válidas). La limpia VisitaLimpiaService. */
  readonly ubicacion = computed<UbicacionVisita | null>(() =>
    this.visitaLimpiaService.ubicacion(this.visitaDetalle()),
  );
  /** Lo que se pinta en el mapa: la ubicación de la visita o, si no hay, Cali. */
  readonly centroMapa = computed<UbicacionVisita>(() => this.ubicacion() ?? UBICACION_POR_DEFECTO);

  /**
   * Campos obligatorios: los que marca el API o los de la lista del tipo de control
   * (Control Preventivo / Control Posterior, ver `visita-campos-obligatorios.ts`).
   * El tipo sale de `tipoVisita`; si no se reconoce, se infiere por los campos presentes.
   */
  readonly camposRequeridos = computed<ReadonlySet<VisitaCampo>>(() => {
    const campos = this.dataForm().flatMap((categoria) => categoria.campos);
    const nombresPorCampo = new Map(
      campos.map((campo) => [campo, this.nombresNormalizados(campo)]),
    );
    const tipoVisita = this.visitaDetalle()?.tipoVisita;
    const obligatorios = resolverNombresObligatorios(
      new Set([...nombresPorCampo.values()].flat()),
      tipoControlDesdeTexto(tipoVisita?.descripcion, tipoVisita?.codigo),
    );
    return new Set(
      campos.filter(
        (campo) =>
          campo.requerido === true || nombresPorCampo.get(campo)!.some((n) => obligatorios.has(n)),
      ),
    );
  });

  /** Categoría a la que pertenece cada campo (para validar por paso). */
  private readonly categoriaPorCampo = computed<ReadonlyMap<VisitaCampo, number>>(
    () =>
      new Map(
        this.dataForm().flatMap((categoria) =>
          categoria.campos.map((campo) => [campo, categoria.id]),
        ),
      ),
  );

  /** Categorías en las que ya se pidió validar: sus obligatorios vacíos se muestran en rojo. */
  readonly categoriasValidadas = signal<ReadonlySet<number>>(new Set());

  /** Pasos del modo Normal: el Mapa primero y luego las categorías en su orden. */
  readonly pasos = computed<PasoFormulario[]>(() => [
    { id: this.categoriaMapaId, nombre: this.categoriaMapaNombre, categoria: null },
    ...this.dataForm().map((categoria) => ({
      id: categoria.id,
      nombre: categoria.nombre,
      categoria,
    })),
  ]);
  /** Paso abierto (índice en `pasos`). Solo uno a la vez, como en el KIT. */
  readonly pasoActual = signal(0);
  /**
   * Pasos que el usuario ya dejó con «Continuar». SAUL no guarda este estado: se pierde al recargar.
   * Los valores sí quedan guardados, porque cada campo se guarda al salir de él.
   */
  readonly pasosHechos = signal<ReadonlySet<number>>(new Set());

  visualizacion: ModoVisualizacion = 'normal';
  readonly visualizaciones = ['Normal', 'Acordion', 'Horizontal'];
  categoriaHorizontalIndice = 0;
  categoriaActivaId: number | null = null;

  private readonly etiquetaPorModo: Record<ModoVisualizacion, string> = {
    normal: 'Normal',
    acordion: 'Acordion',
    horizontal: 'Horizontal',
  };

  private readonly modoPorEtiqueta: Record<string, ModoVisualizacion> = {
    Normal: 'normal',
    Acordion: 'acordion',
    Horizontal: 'horizontal',
  };

  private readonly visitaService = inject(VisitaService);
  private readonly visitaLimpiaService = inject(VisitaLimpiaService);
  private readonly formatoTextoService = inject(FormatoTextoService);
  private readonly route = inject(ActivatedRoute);
  private readonly catastroService = inject(CatastroService);
  private readonly validadorImagen = inject(ValidadorImagenService);
  private readonly cdr = inject(ChangeDetectorRef);

  /** Barrios de catastro para el campo «Barrio o Urbanización». */
  readonly barrios = signal<Barrio[]>([]);

  idVisita: number | null = null;
  /** Signal: así Angular (zoneless) redibuja el aviso aunque se asigne desde una respuesta HTTP. */
  readonly mensajeError = signal('');
  /**
   * Como `esModoObservacion` de SAUL (`accion === 'observar'`): se ve todo, no se guarda nada.
   * Se activa con `/visita/gestionar?accion=observar`.
   */
  modoObservacion = false;

  private readonly versionCampo = new Map<string, number>();
  private readonly archivosPendientes = new Map<string, { file: File; vistaPrevia: string }>();
  private readonly archivoEnviado = new Map<string, File>();
  /** Última selección por campo: si llega otra mientras se valida, la anterior se descarta. */
  private readonly seleccionEnCurso = new Map<string, number>();
  private readonly bloquesPorCampos = new WeakMap<VisitaCampo[], BloqueCampos[]>();
  private readonly sueltosPorCategoria = new WeakMap<VisitaCategoria, VisitaCampo[]>();
  private readonly bloquesPorCategoria = new WeakMap<VisitaCategoria, BloquePresentacion[]>();
  private readonly encabezadosPorTabla = new WeakMap<VisitaTabla, string[]>();
  private readonly columnaTituloPorTabla = new WeakMap<VisitaTabla, 'titulo' | null>();
  private readonly contextoPorCampo = new WeakMap<
    VisitaCampo,
    { campo: VisitaCampo; etiqueta: string; ocultarEtiqueta: boolean }
  >();
  private readonly imagenesNoDisponibles = new Set<string>();
  private readonly extensionesImagen = ['png', 'jpeg', 'jpg'];

  get visualizacionSeleccionada(): string {
    return this.etiquetaPorModo[this.visualizacion];
  }

  get esCategoriaMapaHorizontal(): boolean {
    return this.categoriaHorizontalIndice === 0;
  }

  get categoriaHorizontalActual(): VisitaCategoria | null {
    if (this.esCategoriaMapaHorizontal) {
      return null;
    }
    const categorias = this.dataForm();
    const indiceDatos = this.categoriaHorizontalIndice - 1;
    if (indiceDatos < 0 || indiceDatos >= categorias.length) {
      return null;
    }
    return categorias[indiceDatos];
  }

  get totalCategoriasHorizontal(): number {
    return this.dataForm().length + 1;
  }

  get indiceCategoriaHorizontalVisible(): number {
    return this.totalCategoriasHorizontal === 0 ? 0 : this.categoriaHorizontalIndice + 1;
  }

  get puedeIrCategoriaAnterior(): boolean {
    return this.categoriaHorizontalIndice > 0;
  }

  get puedeIrCategoriaSiguiente(): boolean {
    return this.categoriaHorizontalIndice < this.totalCategoriasHorizontal - 1;
  }

  ngOnInit(): void {
    this.catastroService.getBarrios().subscribe((lista) => this.barrios.set(lista));
    this.modoObservacion = this.route.snapshot?.queryParamMap?.get('accion') === 'observar';
    const id = this.resolverIdVisita();
    if (!Number.isFinite(id) || id <= 0) {
      this.idVisita = null;
      this.dataForm.set([]);
      return;
    }
    void this.cargarFormulario(id);
  }

  ngOnDestroy(): void {
    sessionStorage.removeItem(ID_VISITA_GESTION_SESION);
    this.liberarSelecciones();
  }

  /** Id recibido al navegar (state) o al recargar (sessionStorage del mismo tab). */
  private resolverIdVisita(): number {
    const desdeEstado = Number((history.state as { idVisita?: unknown })?.idVisita);
    if (Number.isFinite(desdeEstado) && desdeEstado > 0) {
      sessionStorage.setItem(ID_VISITA_GESTION_SESION, String(desdeEstado));
      return desdeEstado;
    }
    const desdeSesion = Number(sessionStorage.getItem(ID_VISITA_GESTION_SESION));
    return Number.isFinite(desdeSesion) && desdeSesion > 0 ? desdeSesion : Number.NaN;
  }

  private async cargarFormulario(idVisita: number): Promise<void> {
    // Otra visita: se empieza desde el primer paso.
    this.pasoActual.set(0);
    this.pasosHechos.set(new Set());
    this.categoriasValidadas.set(new Set());
    this.liberarSelecciones();
    this.imagenesNoDisponibles.clear();
    this.idVisita = idVisita;
    this.visitaDetalle.set(null);
    this.mensajeError.set('');
    try {
      const formularioRaw = await firstValueFrom(this.visitaService.obtenerFormulario(idVisita));
      const formulario = this.formatoTextoService.formatearFormulario(
        this.visitaLimpiaService.limpiar(formularioRaw, configuracionVisita),
      );
      this.dataForm.set(formulario);
    } catch (error) {
      // Antes, este error cortaba el método y nunca se consultaba el encabezado.
      console.error('No se pudo generar el formulario de la visita', error);
      if (this.idVisita === idVisita) {
        this.dataForm.set([]);
        this.mensajeError.set(
          'No se pudo cargar el formulario de la visita. Intente recargar la página.',
        );
      }
    }
    this.categoriaHorizontalIndice = 0;
    this.categoriaActivaId = this.categoriaMapaId;
    // Después de generar (haya salido bien o no), se consultan los datos de la visita.
    await this.consultarVisita(idVisita);
  }

  /**
   * Consulta el detalle de la visita (GET /visita/{id}). Si falla, el formulario
   * sigue visible y se avisa con `mensajeError`.
   */
  async consultarVisita(idVisita: number): Promise<void> {
    try {
      const visita = await firstValueFrom(this.visitaService.findById(idVisita));
      // Si mientras tanto se abrió otra visita, esta respuesta ya no aplica.
      if (this.idVisita === idVisita) {
        this.visitaDetalle.set(visita);
      }
    } catch (error) {
      console.error('No se pudo consultar la visita', error);
      // Si ya hay un aviso (por ejemplo, del formulario), no se reemplaza.
      if (this.idVisita === idVisita && !this.mensajeError()) {
        this.mensajeError.set(
          'No se pudo consultar la información de la visita. Intente recargar la página.',
        );
      }
    }
  }

  onVisualizacionChange(etiqueta: string): void {
    this.visualizacion = this.modoPorEtiqueta[etiqueta] ?? 'normal';
    if (this.visualizacion === 'horizontal') {
      this.categoriaHorizontalIndice = 0;
    }
    this.categoriaActivaId = this.categoriaMapaId;
  }

  estadoPaso(indice: number): EstadoPaso {
    if (indice === this.pasoActual()) {
      return 'actual';
    }
    return this.pasosHechos().has(indice) ? 'hecho' : 'pendiente';
  }

  textoEstadoPaso(indice: number): string {
    return { actual: 'paso actual', hecho: 'completado', pendiente: 'pendiente' }[
      this.estadoPaso(indice)
    ];
  }

  idCuerpoPaso(paso: PasoFormulario): string {
    return `gestion-paso-cuerpo-${paso.id}`;
  }

  /** Abre un paso (cualquiera, en cualquier orden) y lo lleva a la vista. */
  abrirPaso(indice: number): void {
    if (indice < 0 || indice >= this.pasos().length) {
      return;
    }
    this.pasoActual.set(indice);
    this.categoriaActivaId = this.pasos()[indice].id;
    this.llevarPasoALaVista(indice);
  }

  /**
   * «Continuar»: si el paso tiene obligatorios vacíos, los marca en rojo, enfoca el primero
   * y no avanza. Si está completo, lo marca como hecho y abre el siguiente.
   */
  continuarPaso(indice: number): void {
    const categoria = this.pasos()[indice]?.categoria;
    if (categoria && !this.validarCategoria(categoria)) {
      return;
    }
    this.pasosHechos.update((hechos) => new Set(hechos).add(indice));
    this.abrirPaso(indice + 1);
  }

  private llevarPasoALaVista(indice: number): void {
    const paso = this.pasos()[indice];
    // Después de dibujar: el paso anterior se cerró y cambió la altura de la página.
    setTimeout(() => {
      document
        .getElementById(this.idSeccionCategoria(paso.id))
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  esRequerido(campo: VisitaCampo): boolean {
    return this.camposRequeridos().has(campo);
  }

  /** Mostrar el estado de validación aunque el usuario no haya pasado por el campo. */
  validarCampo(campo: VisitaCampo): boolean {
    const idCategoria = this.categoriaPorCampo().get(campo);
    return idCategoria !== undefined && this.categoriasValidadas().has(idCategoria);
  }

  /** Obligatorios editables y sin valor de una categoría, en orden de aparición. */
  obligatoriosPendientes(categoria: VisitaCategoria): VisitaCampo[] {
    return categoria.campos.filter(
      (campo) => this.esRequerido(campo) && !this.soloLectura(campo) && !this.tieneValor(campo),
    );
  }

  /** Valida una categoría: muestra sus errores y enfoca el primer pendiente. `true` si está completa. */
  validarCategoria(categoria: VisitaCategoria): boolean {
    this.categoriasValidadas.update((ids) => new Set(ids).add(categoria.id));
    const primero = this.obligatoriosPendientes(categoria)[0];
    if (primero) {
      this.enfocarCampo(primero);
    }
    return !primero;
  }

  /**
   * Valida todo el formulario (para cerrar o enviar la visita). Abre la categoría del
   * primer obligatorio pendiente y lo enfoca. `true` solo si no falta ninguno.
   */
  validarFormulario(): boolean {
    const categorias = this.dataForm();
    this.categoriasValidadas.set(new Set(categorias.map((categoria) => categoria.id)));
    const conPendientes = categorias.find(
      (categoria) => this.obligatoriosPendientes(categoria).length > 0,
    );
    if (!conPendientes) {
      return true;
    }
    if (this.visualizacion === 'normal') {
      const indice = this.pasos().findIndex((paso) => paso.id === conPendientes.id);
      this.pasoActual.set(indice);
      this.categoriaActivaId = conPendientes.id;
    } else {
      this.irACategoria(conPendientes.id);
    }
    this.enfocarCampo(this.obligatoriosPendientes(conPendientes)[0]);
    return false;
  }

  private tieneValor(campo: VisitaCampo): boolean {
    if (this.esImagen(campo)) {
      return (
        this.archivoPendiente(campo.codigo) !== null || this.referenciaGuardada(campo) !== null
      );
    }
    const texto = this.valorCampo(campo).trim();
    return texto.length > 0 && texto !== 'null';
  }

  /** Después de dibujar: el paso o la categoría pudo haberse abierto en este mismo clic. */
  private enfocarCampo(campo: VisitaCampo): void {
    setTimeout(() => {
      const control = document.getElementById(`campo-${campo.id}`);
      control?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      control?.focus({ preventScroll: true });
    });
  }

  private nombresNormalizados(campo: VisitaCampo): string[] {
    return [campo.label, campo.nombre, campo.codigo]
      .map(normalizarNombreCampo)
      .filter((n) => n.length > 0);
  }

  esCategoriaMapa(id: number): boolean {
    return id === this.categoriaMapaId;
  }

  idSeccionCategoria(id: number): string {
    return `gestion-categoria-${id}`;
  }

  irACategoria(id: number): void {
    this.categoriaActivaId = id;

    if (this.visualizacion === 'horizontal') {
      if (this.esCategoriaMapa(id)) {
        this.categoriaHorizontalIndice = 0;
      } else {
        const indice = this.dataForm().findIndex((categoria) => categoria.id === id);
        if (indice >= 0) {
          this.categoriaHorizontalIndice = indice + 1;
        }
      }
      return;
    }

    const seccion = document.getElementById(this.idSeccionCategoria(id));
    if (seccion instanceof HTMLDetailsElement) {
      seccion.open = true;
    }

    seccion?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  irCategoriaAnterior(): void {
    if (this.puedeIrCategoriaAnterior) {
      this.categoriaHorizontalIndice -= 1;
      this.actualizarCategoriaActivaHorizontal();
    }
  }

  irCategoriaSiguiente(): void {
    if (this.puedeIrCategoriaSiguiente) {
      this.categoriaHorizontalIndice += 1;
      this.actualizarCategoriaActivaHorizontal();
    }
  }

  private actualizarCategoriaActivaHorizontal(): void {
    if (this.esCategoriaMapaHorizontal) {
      this.categoriaActivaId = this.categoriaMapaId;
      return;
    }
    this.categoriaActivaId = this.categoriaHorizontalActual?.id ?? null;
  }

  esSelect(campo: VisitaCampo): boolean {
    return campo.tipo === 'select-one';
  }

  esInput(campo: VisitaCampo): boolean {
    return !this.esSelect(campo) && !this.esImagen(campo) && !this.esTextoLargo(campo);
  }

  /** Solo lectura del campo (API) o de toda la visita (modo observación). */
  soloLectura(campo: VisitaCampo): boolean {
    return campo.soloLectura || this.modoObservacion;
  }

  /** Input nativo según el tipo de SAUL: `fecha` → date, `hora` → time, `numero`/`decimal` → number. */
  tipoInput(campo: VisitaCampo): 'text' | 'date' | 'time' | 'number' {
    switch (campo.tipo) {
      case 'fecha':
        return 'date';
      case 'hora':
        return 'time';
      case 'numero':
      case 'decimal':
        return 'number';
      default:
        return 'text';
    }
  }

  /** Valor en el formato que entiende el input nativo ("2026-10-20", "14:30"). */
  valorInput(campo: VisitaCampo): string {
    if (campo.tipo === 'fecha') {
      return fechaParaInput(campo.valor);
    }
    if (campo.tipo === 'hora') {
      return horaParaInput(campo.valor);
    }
    return this.valorCampo(campo);
  }

  /** `hora` guarda al cambiar (ng-change en SAUL); los demás inputs guardan al perder el foco. */
  alCambiarInput(campo: VisitaCampo, valor: string): void {
    if (campo.tipo !== 'hora') {
      return;
    }
    this.actualizarValor(campo, valor);
    this.saveItem(campo);
  }

  alSalirInput(campo: VisitaCampo): void {
    if (campo.tipo === 'hora') {
      return;
    }
    this.saveItem(campo);
  }

  esImagen(campo: VisitaCampo): boolean {
    return campo.tipo === 'imagen';
  }

  esTextoLargo(campo: VisitaCampo): boolean {
    return campo.tipo === 'texto-largo';
  }

  /** Ancho en la grilla, decidido solo por el tipo de campo. */
  claseColumna(campo: VisitaCampo): string {
    return this.esTextoLargo(campo) ? 'col-12' : 'col-12 col-md-6';
  }

  /** Orden de tablas y campos. Si la categoría no trae bloques, se arma uno estable. */
  bloquesCategoria(categoria: VisitaCategoria): BloquePresentacion[] {
    if (categoria.bloques?.length) {
      return categoria.bloques;
    }
    const guardados = this.bloquesPorCategoria.get(categoria);
    if (guardados) {
      return guardados;
    }
    const bloques: BloquePresentacion[] = categoria.tabla
      ? [
          { tabla: categoria.tabla, campos: [] },
          { tabla: null, campos: this.camposFueraDeTabla(categoria) },
        ]
      : [{ tabla: null, campos: categoria.campos }];
    this.bloquesPorCategoria.set(categoria, bloques);
    return bloques;
  }

  /** Campos que no están en la tabla. La celda de la tabla es el mismo objeto, así que no se pinta dos veces. */
  camposFueraDeTabla(categoria: VisitaCategoria): VisitaCampo[] {
    const guardados = this.sueltosPorCategoria.get(categoria);
    if (guardados) {
      return guardados;
    }
    const enTabla = new Set<VisitaCampo>();
    for (const fila of categoria.tabla?.filas ?? []) {
      for (const celda of fila.celdas) {
        if (celda) {
          enTabla.add(celda);
        }
      }
    }
    const sueltos = categoria.campos.filter((campo) => !enTabla.has(campo));
    this.sueltosPorCategoria.set(categoria, sueltos);
    return sueltos;
  }

  bloquesCampos(campos: VisitaCampo[]): BloqueCampos[] {
    const guardados = this.bloquesPorCampos.get(campos);
    if (guardados) {
      return guardados;
    }
    const bloques: BloqueCampos[] = [];
    let pares: ParRegistro[] = [];
    const cerrarPares = (): void => {
      if (pares.length === 0) {
        return;
      }
      const filas: CeldaRegistro[][] = [];
      for (let indice = 0; indice < pares.length; indice += 2) {
        filas.push(this.celdasRegistro(pares[indice], pares[indice + 1]));
      }
      bloques.push({ id: filas[0][0].campo.id, filas, campos: [] });
      pares = [];
    };

    for (let indice = 0; indice < campos.length; indice += 1) {
      const campo = campos[indice];
      if (this.esImagen(campo)) {
        const siguiente = campos[indice + 1];
        const descripcion = siguiente && !this.esImagen(siguiente) ? siguiente : null;
        pares.push({ imagen: campo, descripcion });
        if (descripcion) {
          indice += 1;
        }
        continue;
      }
      cerrarPares();
      bloques.push({ id: campo.id, filas: [], campos: [campo] });
    }
    cerrarPares();
    this.bloquesPorCampos.set(campos, bloques);
    return bloques;
  }

  contextoCampo(campo: VisitaCampo, etiqueta: string, ocultarEtiqueta = false) {
    const existente = this.contextoPorCampo.get(campo);
    if (existente) {
      existente.etiqueta = etiqueta;
      existente.ocultarEtiqueta = ocultarEtiqueta;
      return existente;
    }
    const contexto = { campo, etiqueta, ocultarEtiqueta };
    this.contextoPorCampo.set(campo, contexto);
    return contexto;
  }

  /**
   * Imágenes en order-md-1/2 y descripciones en order-md-3/4. El orden del DOM
   * (imagen A, descripción A, imagen B, descripción B) es el de móvil.
   * Un registro solo conserva order-md-1/3; `salto` (order-md-2) baja su descripción bajo la imagen.
   * Si A no tiene descripción, la de B se corre con offset-md-6 para quedar bajo su imagen.
   */
  private celdasRegistro(izquierda: ParRegistro, derecha?: ParRegistro): CeldaRegistro[] {
    const clase = 'col-12 col-md-6';
    const celdas: CeldaRegistro[] = [
      { campo: izquierda.imagen, clase: `${clase} order-md-1`, salto: false },
    ];
    if (izquierda.descripcion) {
      celdas.push({ campo: izquierda.descripcion, clase: `${clase} order-md-3`, salto: !derecha });
    }
    if (!derecha) {
      return celdas;
    }
    celdas.push({ campo: derecha.imagen, clase: `${clase} order-md-2`, salto: false });
    if (derecha.descripcion) {
      const desplazamiento = izquierda.descripcion ? '' : ' offset-md-6';
      celdas.push({
        campo: derecha.descripcion,
        clase: `${clase} order-md-4${desplazamiento}`,
        salto: false,
      });
    }
    return celdas;
  }

  /**
   * `titulo`: la API reserva una columna para el título de la fila y alguna fila lo trae.
   * Si la API no reserva esa columna, no se agrega ninguna (tampoco una de numeración "#").
   */
  columnaTitulo(tabla: VisitaTabla): 'titulo' | null {
    const guardada = this.columnaTituloPorTabla.get(tabla);
    if (guardada !== undefined) {
      return guardada;
    }
    const columna =
      tabla.tituloIndependiente &&
      tabla.filas.some((fila) => this.normalizarTexto(fila.titulo).length > 0)
        ? 'titulo'
        : null;
    this.columnaTituloPorTabla.set(tabla, columna);
    return columna;
  }

  mostrarTitulo(tabla: VisitaTabla): boolean {
    return this.columnaTitulo(tabla) !== null;
  }

  encabezadosVisibles(tabla: VisitaTabla): string[] {
    const guardados = this.encabezadosPorTabla.get(tabla);
    if (guardados) {
      return guardados;
    }
    let encabezados = tabla.encabezados;
    if (tabla.tituloIndependiente && !this.mostrarTitulo(tabla)) {
      encabezados = tabla.encabezados.slice(1);
    }
    this.encabezadosPorTabla.set(tabla, encabezados);
    return encabezados;
  }

  esTablaCompacta(tabla: VisitaTabla): boolean {
    return this.encabezadosVisibles(tabla).length <= 4;
  }

  nombreArchivo(campo: VisitaCampo): string {
    return (
      this.archivoPendiente(campo.codigo)?.name ||
      this.referenciaGuardada(campo) ||
      'Ningún archivo seleccionado'
    );
  }

  archivoPendiente(codigo: string): File | null {
    return this.archivosPendientes.get(codigo)?.file ?? null;
  }

  vistaPrevia(codigo: string): string | null {
    return this.archivosPendientes.get(codigo)?.vistaPrevia ?? null;
  }

  referenciaGuardada(campo: VisitaCampo): string | null {
    if (typeof campo.valor !== 'string') {
      return null;
    }
    const nombre = campo.valor.trim();
    return nombre && nombre !== 'null' ? nombre : null;
  }

  urlImagenGuardada(campo: VisitaCampo): string | null {
    const nombre = this.referenciaGuardada(campo);
    return nombre ? this.visitaService.urlDocumento(nombre) : null;
  }

  imagenNoDisponible(codigo: string): boolean {
    return this.imagenesNoDisponibles.has(codigo);
  }

  marcarImagenNoDisponible(codigo: string): void {
    this.imagenesNoDisponibles.add(codigo);
  }

  /** Llega desde «Seleccionar» (galería/carpetas) o «Tomar foto» (cámara del celular). */
  async onArchivoSeleccionado(campo: VisitaCampo, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo || this.soloLectura(campo) || this.idVisita === null) {
      return;
    }

    const idVisita = this.idVisita;
    const seleccion = (this.seleccionEnCurso.get(campo.codigo) ?? 0) + 1;
    this.seleccionEnCurso.set(campo.codigo, seleccion);

    const error = await this.validadorImagen.validar(archivo);
    if (this.seleccionEnCurso.get(campo.codigo) !== seleccion || this.idVisita !== idVisita) {
      return;
    }
    if (error) {
      this.mensajeError.set(error);
      return;
    }

    this.liberarSeleccion(campo.codigo);
    const vistaPrevia = URL.createObjectURL(archivo);
    this.archivosPendientes.set(campo.codigo, { file: archivo, vistaPrevia });
    this.mensajeError.set('');
    // Zoneless: el Map no es signal y esto ocurre tras un await; se pide redibujar.
    this.cdr.markForCheck();
    this.saveItem(campo);
  }

  limpiarSeleccion(campo: VisitaCampo): void {
    this.liberarSeleccion(campo.codigo);
  }

  private liberarSeleccion(codigo: string): void {
    const pendiente = this.archivosPendientes.get(codigo);
    if (pendiente) {
      URL.revokeObjectURL(pendiente.vistaPrevia);
      this.archivosPendientes.delete(codigo);
    }
    this.archivoEnviado.delete(codigo);
  }

  private liberarSelecciones(): void {
    for (const codigo of this.archivosPendientes.keys()) {
      this.liberarSeleccion(codigo);
    }
  }

  labelCampo(campo: VisitaCampo): string {
    return (campo.label?.trim() || campo.nombre).trim();
  }

  valorCampo(campo: VisitaCampo): string {
    if (campo.valor === null || campo.valor === undefined) {
      return '';
    }
    return String(campo.valor);
  }

  opcionesSelect(campo: VisitaCampo): string[] {
    if (campo.opciones && campo.opciones.length > 0) {
      return campo.opciones;
    }
    if (campo.dominio === 'siono') {
      return ['Si', 'No'];
    }
    const valor = this.valorCampo(campo);
    return valor ? [valor] : [];
  }

  etiquetaColumna(tabla: VisitaTabla, indiceCelda: number): string {
    const desplazamiento = tabla.tituloIndependiente ? 1 : 0;
    return tabla.encabezados[indiceCelda + desplazamiento] ?? '';
  }

  /** Texto del campo que no está ya en el encabezado ni en el título de la fila. */
  etiquetaAdicional(campo: VisitaCampo, encabezado: string, tituloFila: string): string {
    const propia = this.labelCampo(campo);
    if (this.mismoTexto(propia, encabezado) || this.mismoTexto(propia, tituloFila)) {
      return '';
    }
    return propia;
  }

  etiquetaAccesible(tituloFila: string, encabezado: string, adicional: string): string {
    const partes = [tituloFila, encabezado, adicional];
    const unicas: string[] = [];
    for (const parte of partes) {
      const texto = parte.trim();
      if (texto && !unicas.some((existente) => this.mismoTexto(existente, texto))) {
        unicas.push(texto);
      }
    }
    return unicas.join(', ');
  }

  private mismoTexto(a: string, b: string): boolean {
    return this.normalizarTexto(a) === this.normalizarTexto(b);
  }

  private normalizarTexto(texto: string): string {
    return texto.trim().toLocaleLowerCase('es').replace(/\s+/g, ' ');
  }

  /** El campo «Barrio o Urbanización» se muestra como lista de barrios de catastro. */
  esCampoBarrio(campo: VisitaCampo): boolean {
    return this.sinTildes(this.labelCampo(campo)).includes('barrio o urbanizacion');
  }

  /** Nombres de barrio. Si el valor guardado no está en la lista, se conserva como opción. */
  opcionesBarrio(campo: VisitaCampo): string[] {
    const nombres = this.barrios().map((b) => b.nombre);
    const valor = this.valorCampo(campo);
    return valor && !nombres.includes(valor) ? [valor, ...nombres] : nombres;
  }

  /** Guarda el nombre del barrio y llena «Código de barrio» y «Comuna». */
  seleccionarBarrio(campo: VisitaCampo, nombre: string): void {
    if (this.soloLectura(campo)) {
      return;
    }
    this.actualizarValor(campo, nombre);
    this.saveItem(campo);

    const barrio = this.barrios().find((b) => b.nombre === nombre);
    if (!barrio) {
      return;
    }
    const codigo = String(barrio.codigo ?? '').trim();
    // En Cali el código de barrio es CCBB: los dos primeros dígitos son la comuna (0608 → 6).
    const comuna = codigo.length >= 2 ? String(Number(codigo.slice(0, 2))) : '';

    this.llenarCampo('codigo de barrio', codigo);
    if (comuna && comuna !== 'NaN') {
      this.llenarCampo('comuna', comuna);
    }
  }

  private llenarCampo(etiqueta: string, valor: string): void {
    const campo = this.dataForm()
      .flatMap((categoria) => categoria.campos)
      .find((c) => this.sinTildes(this.labelCampo(c)) === etiqueta);
    if (!campo || !valor || this.soloLectura(campo)) {
      return;
    }
    this.actualizarValor(campo, valor);
    this.saveItem(campo);
  }

  private sinTildes(texto: string): string {
    return this.normalizarTexto(texto)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  actualizarValor(campo: VisitaCampo, texto: string): void {
    if (this.soloLectura(campo)) {
      return;
    }
    campo.valor = this.valorDesdeTexto(campo.valor, texto);
  }

  saveItem(campo: VisitaCampo | undefined): void {
    // Igual que SAUL: en modo observación no se guarda nada (bloquearModoObservacion).
    if (campo === undefined || this.soloLectura(campo) || this.idVisita === null) {
      return;
    }

    const idVisita = this.idVisita;
    let valorEnviado = campo.valor;
    let archivo: File | null = null;

    if (campo.tipo === 'hora') {
      valorEnviado = horaParaSaul(campo.valor);
    } else if (campo.tipo === 'fecha') {
      valorEnviado = fechaParaSaul(campo.valor);
    } else if (campo.tipo === 'imagen') {
      archivo = this.archivoPendiente(campo.codigo);
      if (!archivo) {
        return;
      }
      const partes = archivo.name.split('.');
      const extension = partes.length > 1 ? (partes.pop()?.toLowerCase() ?? '') : '';
      if (this.extensionesImagen.indexOf(extension) === -1) {
        this.mensajeError.set('Solo se permiten archivos con extensión PNG, JPEG o JPG.');
        return;
      }
      if (this.archivoEnviado.get(campo.codigo) === archivo) {
        return;
      }
      this.archivoEnviado.set(campo.codigo, archivo);
    }

    const version = (this.versionCampo.get(campo.codigo) ?? 0) + 1;
    this.versionCampo.set(campo.codigo, version);
    this.mensajeError.set('');

    const peticion = archivo
      ? this.visitaService.guardarImagen(idVisita, campo, archivo)
      : this.visitaService.guardarCampo(idVisita, campo, valorEnviado);

    peticion.subscribe({
      next: (respuesta) => {
        if (this.versionCampo.get(campo.codigo) !== version) {
          return;
        }
        if (!respuesta?.success || respuesta.success !== true) {
          this.archivoEnviado.delete(campo.codigo);
          this.mensajeError.set(
            'Ha ocurrido un error en response informe al desarrollador. Gracias. ' +
              (respuesta?.msg ?? ''),
          );
          return;
        }
        if (respuesta.value && respuesta.value !== '') {
          this.actualizarPorAtributo(campo.codigo, respuesta.value);
          if (archivo) {
            this.imagenesNoDisponibles.delete(campo.codigo);
            this.liberarSeleccion(campo.codigo);
          }
        }
      },
      error: () => {
        if (this.versionCampo.get(campo.codigo) !== version) {
          return;
        }
        this.archivoEnviado.delete(campo.codigo);
        this.mensajeError.set('2Ha ocurrido un error informe al desarrollador. Gracias.');
      },
    });
  }

  private actualizarPorAtributo(codigo: string, nuevoValor: string): void {
    const campo = this.visitaLimpiaService.indexarPorCodigo(this.dataForm())[codigo];
    if (campo) {
      campo.valor = nuevoValor;
    }
  }

  private valorDesdeTexto(
    anterior: string | number | boolean | null,
    texto: string,
  ): string | number | boolean | null {
    if (texto === '' && (anterior === null || anterior === undefined)) {
      return null;
    }
    if (typeof anterior === 'number' && String(anterior) === texto) {
      return anterior;
    }
    return texto;
  }
}
