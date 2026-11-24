import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  Canvas,
  Circle,
  FabricImage,
  FabricObject,
  Group,
  IText,
  Line,
  Rect,
  Triangle,
} from 'fabric';

import { COLORES_SSJ } from '../../../../core/services/estilos-visita.service';
import { Button } from '../../../../shared/components/button/button';

const ANCHO_MAXIMO_LIENZO = 900;
/** Lado máximo de la imagen exportada: mantiene el archivo por debajo del tope de 10 MB. */
const LADO_MAXIMO_EXPORTACION = 4096;
const CALIDAD_JPEG = 0.9;
const GROSOR_TRAZO = 3;

/** Colores de anotación tomados de la guía de estilos (KIT UI SAUL3). En minúscula para compararlos. */
export const PALETA_ANOTACION = [
  { nombre: 'Rojo', valor: COLORES_SSJ.rojo.toLowerCase() },
  { nombre: 'Naranja', valor: COLORES_SSJ.naranja.toLowerCase() },
  { nombre: 'Amarillo', valor: COLORES_SSJ.amarillo.toLowerCase() },
  { nombre: 'Verde', valor: COLORES_SSJ.verde.toLowerCase() },
  { nombre: 'Azul', valor: COLORES_SSJ.azul.toLowerCase() },
  { nombre: 'Negro', valor: COLORES_SSJ.negro.toLowerCase() },
  { nombre: 'Blanco', valor: COLORES_SSJ.blanco.toLowerCase() },
] as const;

/** Solo colores hexadecimales de 6 dígitos (lo que entrega `<input type="color">`). */
const COLOR_VALIDO = /^#[0-9a-f]{6}$/i;

/**
 * Editor de imágenes de una visita (fabric.js): texto, rectángulo, círculo, línea, flecha,
 * rotación y borrado.
 *
 * Es presentacional: recibe la imagen como Blob y devuelve un `File` JPEG nuevo en `guardado`.
 * No sube nada ni modifica la imagen original; `Gestion` la envía por el mismo flujo
 * de validación y guardado de cualquier foto, así saul3 conserva la original y la editada.
 */
@Component({
  selector: 'app-editor-imagen-visita',
  imports: [Button],
  templateUrl: './editor-imagen-visita.html',
  styleUrl: './editor-imagen-visita.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorImagenVisita {
  /** Imagen a editar: un archivo recién seleccionado o la imagen guardada descargada como Blob. */
  readonly imagen = input.required<Blob>();
  /** Nombre sin extensión que se usa para el archivo editado (`<nombre>-editada.jpg`). */
  readonly nombreBase = input('imagen-visita');

  readonly guardado = output<File>();
  readonly cancelado = output<void>();

  protected readonly cargando = signal(true);
  protected readonly hayCambios = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly paleta = PALETA_ANOTACION;
  /** Color para las anotaciones nuevas y para recolorear la selección. */
  protected readonly color = signal<string>(PALETA_ANOTACION[0].valor);
  /** El color activo no está en la paleta (vino de «Otro»). */
  protected readonly colorPersonalizado = computed(
    () => !PALETA_ANOTACION.some((opcion) => opcion.valor === this.color()),
  );

  private readonly lienzoRef = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');
  private readonly contenedorRef = viewChild.required<ElementRef<HTMLDivElement>>('contenedor');

  private canvas: Canvas | null = null;
  private imagenBase: FabricImage | null = null;
  private urlObjeto: string | null = null;
  /** Evita que una carga lenta pise a una más reciente. */
  private cargaActual = 0;

  constructor() {
    afterRenderEffect(() => {
      const imagen = this.imagen();
      untracked(() => void this.cargarImagen(imagen));
    });
    inject(DestroyRef).onDestroy(() => this.liberarRecursos());
  }

  // ---------------------------------------------------------------- carga

  private async cargarImagen(imagen: Blob): Promise<void> {
    const carga = ++this.cargaActual;
    this.error.set(null);
    this.cargando.set(true);

    this.revocarUrlObjeto();
    const url = URL.createObjectURL(imagen);
    this.urlObjeto = url;

    try {
      const imagenFabric = await FabricImage.fromURL(url);
      if (carga !== this.cargaActual) {
        return;
      }
      if (!imagenFabric.width || !imagenFabric.height) {
        throw new Error('Imagen vacía');
      }

      const canvas = this.obtenerCanvas();
      canvas.clear();
      canvas.backgroundColor = '#ffffff';
      imagenFabric.set({ selectable: false, evented: false, hasControls: false });
      this.imagenBase = imagenFabric;
      canvas.add(imagenFabric);
      this.ajustarLienzoAImagen();
      this.hayCambios.set(false);
    } catch {
      if (carga === this.cargaActual) {
        this.error.set('No se pudo cargar la imagen en el editor.');
      }
    } finally {
      if (carga === this.cargaActual) {
        this.cargando.set(false);
      }
    }
  }

  // ---------------------------------------------------------- herramientas

  agregarTexto(): void {
    this.agregarObjeto(
      new IText('Escriba aquí', {
        fontSize: 24,
        fill: this.color(),
        fontFamily: 'Arial, sans-serif',
      }),
    );
  }

  agregarRectangulo(): void {
    this.agregarObjeto(
      new Rect({
        width: 140,
        height: 90,
        fill: 'transparent',
        stroke: this.color(),
        strokeWidth: GROSOR_TRAZO,
        strokeUniform: true,
      }),
    );
  }

  agregarCirculo(): void {
    this.agregarObjeto(
      new Circle({
        radius: 50,
        fill: 'transparent',
        stroke: this.color(),
        strokeWidth: GROSOR_TRAZO,
        strokeUniform: true,
      }),
    );
  }

  agregarLinea(): void {
    this.agregarObjeto(
      new Line([0, 0, 160, 0], { stroke: this.color(), strokeWidth: GROSOR_TRAZO, strokeUniform: true }),
    );
  }

  agregarFlecha(): void {
    const largo = 160;
    const linea = new Line([0, 0, largo - 14, 0], { stroke: this.color(), strokeWidth: GROSOR_TRAZO });
    const punta = new Triangle({
      width: 18,
      height: 18,
      fill: this.color(),
      left: largo,
      top: 0,
      angle: 90,
      originX: 'center',
      originY: 'center',
    });
    this.agregarObjeto(new Group([linea, punta]));
  }

  /**
   * Cambia el color activo. Si hay anotaciones seleccionadas, también las recolorea.
   * Valores que no sean hexadecimales de 6 dígitos se ignoran.
   */
  seleccionarColor(valor: string): void {
    if (!COLOR_VALIDO.test(valor)) {
      return;
    }
    this.color.set(valor.toLowerCase());

    const canvas = this.canvas;
    if (!canvas) {
      return;
    }
    const seleccion = canvas.getActiveObjects().filter((objeto) => objeto !== this.imagenBase);
    if (!seleccion.length) {
      return;
    }
    for (const objeto of seleccion) {
      this.pintar(objeto, valor);
    }
    canvas.requestRenderAll();
    this.hayCambios.set(true);
  }

  protected alElegirColorPersonalizado(evento: Event): void {
    this.seleccionarColor((evento.target as HTMLInputElement).value);
  }

  /** Rota la selección; si no hay selección, rota la imagen y reajusta el lienzo. */
  rotar90(): void {
    const canvas = this.canvas;
    if (!canvas || !this.imagenBase) {
      return;
    }
    const activo = canvas.getActiveObject();
    if (activo) {
      activo.rotate(((activo.angle ?? 0) + 90) % 360);
      activo.setCoords();
    } else {
      this.imagenBase.rotate(((this.imagenBase.angle ?? 0) + 90) % 360);
      this.ajustarLienzoAImagen();
    }
    canvas.requestRenderAll();
    this.hayCambios.set(true);
  }

  eliminarSeleccion(): void {
    const canvas = this.canvas;
    if (!canvas) {
      return;
    }
    const seleccion = canvas.getActiveObjects().filter((objeto) => objeto !== this.imagenBase);
    if (!seleccion.length) {
      return;
    }
    canvas.discardActiveObject();
    canvas.remove(...seleccion);
    canvas.requestRenderAll();
    this.hayCambios.set(true);
  }

  /** Supr elimina la selección, salvo mientras se escribe en un texto. */
  @HostListener('document:keydown.delete')
  protected alPresionarSuprimir(): void {
    const activo = this.canvas?.getActiveObject();
    if (activo instanceof IText && activo.isEditing) {
      return;
    }
    this.eliminarSeleccion();
  }

  // ------------------------------------------------------- guardar / salir

  async guardarEdicion(): Promise<void> {
    const canvas = this.canvas;
    const imagen = this.imagenBase;
    if (!canvas || !imagen || this.cargando()) {
      return;
    }

    canvas.discardActiveObject();
    canvas.renderAll();

    // Exporta a la resolución original de la foto (no a la del lienzo en pantalla), con tope.
    const escala = imagen.scaleX || 1;
    const ladoMayor = Math.max(canvas.getWidth(), canvas.getHeight());
    const multiplicador = Math.min(1 / escala, LADO_MAXIMO_EXPORTACION / ladoMayor);

    this.cargando.set(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toCanvasElement(multiplicador).toBlob(resolve, 'image/jpeg', CALIDAD_JPEG),
      );
      if (!blob) {
        throw new Error('Exportación vacía');
      }
      const nombre = `${this.nombreSeguro()}-editada.jpg`;
      this.guardado.emit(new File([blob], nombre, { type: 'image/jpeg' }));
      this.hayCambios.set(false);
    } catch {
      this.error.set('No se pudo generar la imagen editada.');
    } finally {
      this.cargando.set(false);
    }
  }

  cancelar(): void {
    this.cancelado.emit();
  }

  // ------------------------------------------------------------- internos

  private obtenerCanvas(): Canvas {
    if (!this.canvas) {
      this.canvas = new Canvas(this.lienzoRef().nativeElement, {
        preserveObjectStacking: true,
        selection: true,
      });
      this.canvas.on('object:modified', () => this.hayCambios.set(true));
      // Al seleccionar una anotación, la paleta muestra su color.
      const sincronizarColor = () => {
        const activo = this.canvas?.getActiveObject();
        const color = activo && activo !== this.imagenBase ? this.colorDe(activo) : null;
        if (color && COLOR_VALIDO.test(color)) {
          this.color.set(color.toLowerCase());
        }
      };
      this.canvas.on('selection:created', sincronizarColor);
      this.canvas.on('selection:updated', sincronizarColor);
    }
    return this.canvas;
  }

  private agregarObjeto(objeto: FabricObject): void {
    const canvas = this.canvas;
    if (!canvas || !this.imagenBase || this.cargando()) {
      return;
    }
    canvas.add(objeto);
    canvas.centerObject(objeto);
    objeto.setCoords();
    canvas.setActiveObject(objeto);
    canvas.requestRenderAll();
    this.hayCambios.set(true);
  }

  /** Texto y punta de flecha se rellenan; rectángulos, círculos y líneas cambian el borde. */
  private pintar(objeto: FabricObject, color: string): void {
    if (objeto instanceof Group) {
      for (const parte of objeto.getObjects()) {
        this.pintar(parte, color);
      }
      objeto.set('dirty', true);
    } else if (objeto instanceof IText || objeto instanceof Triangle) {
      objeto.set('fill', color);
    } else {
      objeto.set('stroke', color);
    }
  }

  private colorDe(objeto: FabricObject): string | null {
    if (objeto instanceof Group) {
      const primera = objeto.getObjects()[0];
      return primera ? this.colorDe(primera) : null;
    }
    const valor = objeto instanceof IText || objeto instanceof Triangle ? objeto.fill : objeto.stroke;
    return typeof valor === 'string' ? valor : null;
  }

  /** Escala la imagen al ancho disponible (máx. 900 px) y ajusta el lienzo a ella. */
  private ajustarLienzoAImagen(): void {
    const canvas = this.canvas;
    const imagen = this.imagenBase;
    if (!canvas || !imagen) {
      return;
    }

    const girada = Math.abs((imagen.angle ?? 0) % 180) === 90;
    const anchoReal = girada ? imagen.height : imagen.width;
    const altoReal = girada ? imagen.width : imagen.height;

    const escala = Math.min(1, this.anchoDisponible() / anchoReal);

    canvas.setDimensions({ width: Math.round(anchoReal * escala), height: Math.round(altoReal * escala) });
    imagen.set({ scaleX: escala, scaleY: escala, originX: 'center', originY: 'center' });
    canvas.centerObject(imagen);
    imagen.setCoords();
    canvas.sendObjectToBack(imagen);
    canvas.requestRenderAll();
  }

  /** Ancho útil del contenedor (sin su padding), para que el lienzo no genere scroll horizontal. */
  private anchoDisponible(): number {
    const contenedor = this.contenedorRef().nativeElement;
    const estilo = getComputedStyle(contenedor);
    const padding = (parseFloat(estilo.paddingLeft) || 0) + (parseFloat(estilo.paddingRight) || 0);
    const ancho = Math.floor(contenedor.clientWidth - padding);
    return Math.min(ancho > 0 ? ancho : ANCHO_MAXIMO_LIENZO, ANCHO_MAXIMO_LIENZO);
  }

  /** Solo letras, números, punto, guion y guion bajo: el nombre viaja al backend. */
  private nombreSeguro(): string {
    const limpio = this.nombreBase()
      .replace(/\.[^.]+$/, '')
      .replace(/[^A-Za-z0-9._-]+/g, '-')
      .replace(/^[-.]+|[-.]+$/g, '')
      .slice(0, 80);
    return limpio || 'imagen-visita';
  }

  private revocarUrlObjeto(): void {
    if (this.urlObjeto) {
      URL.revokeObjectURL(this.urlObjeto);
      this.urlObjeto = null;
    }
  }

  private liberarRecursos(): void {
    this.cargaActual++;
    this.revocarUrlObjeto();
    void this.canvas?.dispose();
    this.canvas = null;
    this.imagenBase = null;
  }
}
