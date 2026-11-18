import { DOCUMENT } from '@angular/common';
import { Injectable, inject, isDevMode } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

/**
 * Estilos de la Guía de estilos y del Grupo 34 (componentes de formulario).
 * Es la única fuente de colores, fuente y títulos para las pantallas de Visitas:
 * los componentes no escriben colores ni tamaños de título, los toman de aquí.
 */

/** Colores de la guía. Cualquier color que necesite Visitas sale de esta lista. */
export const COLORES_SSJ = {
  // Tema y marca
  azul: '#0943B5',
  azulClaro: '#B5C7E9',
  naranja: '#F3561F',
  amarillo: '#FECC2F',
  fondoMarca: '#F4F4F4',
  // Estados (botones y campos)
  verde: '#068460',
  rojo: '#A80521',
  /** Solo checkbox, radio y switch marcados (así aparecen en el Grupo 34). */
  control: '#004884',
  // Escala de grises
  blanco: '#FFFFFF',
  grisFondo: '#F6F8F9',
  grisDeshabilitado: '#F2F2F2',
  grisBorde: '#737373',
  grisTexto: '#4B4B4B',
  negro: '#000000',
} as const;

export type ColorSsj = keyof typeof COLORES_SSJ;

export const FUENTE_SSJ = "'Nunito Sans', sans-serif";

export type NivelTitulo = 1 | 2 | 3;

export interface EstiloTitulo {
  /** Etiqueta HTML que corresponde al nivel. */
  etiqueta: 'h1' | 'h2' | 'h3';
  /** Para qué se usa, según la guía. */
  uso: string;
  tamano: string;
  peso: number;
  color: ColorSsj;
}

/**
 * Títulos según la guía (tamaño base 16px):
 * h1 2em (32px), h2 1.5em (24px), h3 1.17em (18.72px).
 * En el KIT UI SAUL3 y en VIS_TABL solo el h1 va en azul; h2 y h3 van en negro.
 */
export const TITULOS_SSJ: Readonly<Record<NivelTitulo, EstiloTitulo>> = {
  1: {
    etiqueta: 'h1',
    uso: 'Título principal de la página (uno por pantalla)',
    tamano: '2rem',
    peso: 700,
    color: 'azul',
  },
  2: {
    etiqueta: 'h2',
    uso: 'Secciones principales dentro de la página',
    tamano: '1.5rem',
    peso: 700,
    color: 'negro',
  },
  3: {
    etiqueta: 'h3',
    uso: 'Subsecciones dentro de una sección',
    tamano: '1.17rem',
    peso: 700,
    color: 'negro',
  },
};

/** Tonos de la etiqueta de estado (VIS_TABL). */
export type TonoEstado = 'aviso' | 'exito' | 'info' | 'peligro' | 'neutro';

/**
 * Colores de cada etiqueta. Los fondos son los de VIS_TABL; el texto de «aviso» y «éxito»
 * se oscureció porque el del diseño no llega al contraste mínimo AA (4.5:1):
 * naranja sobre amarillo daba 2.6:1 y verde sobre verde claro 4.1:1.
 */
export const TONOS_ESTADO: Readonly<Record<TonoEstado, { fondo: string; texto: string }>> = {
  aviso: { fondo: '#FCE088', texto: '#9A3412' },
  exito: { fondo: '#DAF5E4', texto: '#05714F' },
  info: { fondo: COLORES_SSJ.azulClaro, texto: COLORES_SSJ.azul },
  peligro: { fondo: '#FEE7DB', texto: COLORES_SSJ.rojo },
  neutro: { fondo: COLORES_SSJ.grisDeshabilitado, texto: COLORES_SSJ.grisTexto },
};

/** Sin tildes ni mayúsculas, para comparar estados que SAUL escribe de varias formas. */
function normalizar(texto: string | null | undefined): string {
  return (texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tono de un estado de visita, como en VIS_TABL:
 * «Pendiente por visita» amarillo, «Visitada» verde, «Pendiente…» azul, «Vencida» rojo.
 * «Emitido» se trata como terminado (verde) y «Anulado» como peligro.
 */
export function tonoEstadoVisita(estado: string | null | undefined): TonoEstado {
  const texto = normalizar(estado);
  if (!texto) {
    return 'neutro';
  }
  if (/vencid|anulad|rechazad/.test(texto)) {
    return 'peligro';
  }
  if (/pendiente ?(por|de)? ?visita|pendientevisita/.test(texto)) {
    return 'aviso';
  }
  if (/visitad|emitid|aprobad|cerrad|finalizad/.test(texto)) {
    return 'exito';
  }
  if (/pendiente|revision|asignad/.test(texto)) {
    return 'info';
  }
  return 'neutro';
}

/** Clase que el servicio pone en `<body>` mientras se está en una pantalla de Visitas. */
export const CLASE_VISITAS = 'ssj-visitas';

/** Rutas de Visitas (ver `app.routes.ts`). */
const RUTA_VISITAS = /^\/visita(\/|\?|#|$)/;

/** Zona de contenido del Layout: los estilos no tocan encabezado, menú ni pie de página. */
const CONTENIDO = `body.${CLASE_VISITAS} .contenido-principal`;

const ID_HOJA = 'ssj-estilos-visita';

/** Archivos de Nunito Sans que ya están en `public/assets/fonts`. */
const ARCHIVOS_FUENTE: readonly [peso: number, archivo: string][] = [
  [400, 'NunitoSans-Regular.ttf'],
  [600, 'NunitoSans-SemiBold.ttf'],
  [700, 'NunitoSans-Bold.ttf'],
  [800, 'NunitoSans-ExtraBold.ttf'],
];

function nombreVariable(color: ColorSsj): string {
  return `--ssj-${color.replace(/[A-Z]/g, (letra) => `-${letra.toLowerCase()}`)}`;
}

/**
 * Aplica la guía de estilos en las pantallas de Visitas.
 *
 * - Pone las variables `--ssj-*` (colores y fuente) y la fuente Nunito Sans en el contenido.
 * - Fija los títulos h1, h2 y h3 a la guía, aunque el componente traiga su propio tamaño o color.
 * - Ofrece las clases `ssj-titulo ssj-titulo--N` para cuando el nivel visual no coincide con la etiqueta.
 *
 * Se activa solo (lo inyecta `VisitaService`) y solo afecta las rutas `/visita/...`.
 */
@Injectable({ providedIn: 'root' })
export class EstilosVisitaService {
  readonly colores = COLORES_SSJ;
  readonly titulos = TITULOS_SSJ;
  readonly fuente = FUENTE_SSJ;

  private readonly documento = inject(DOCUMENT);
  private readonly router = inject(Router);
  private iniciado = false;
  private revisionDesborde: ReturnType<typeof setTimeout> | null = null;

  /** Inserta la hoja de estilos una sola vez y sigue la navegación para activar/desactivar Visitas. */
  iniciar(): void {
    if (this.iniciado) {
      return;
    }
    this.iniciado = true;
    this.insertarHoja();
    this.sincronizar(this.router.url);
    this.router.events
      .pipe(filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd))
      .subscribe((evento) => {
        this.sincronizar(evento.urlAfterRedirects);
        this.programarRevisionDesborde();
      });
    if (isDevMode()) {
      this.documento.defaultView?.addEventListener('resize', () =>
        this.programarRevisionDesborde(),
      );
      this.programarRevisionDesborde();
    }
  }

  /**
   * Solo en desarrollo: avisa en la consola qué elementos de Visitas se salen del ancho de la pantalla.
   * La página no muestra desplazamiento lateral (ver `reglasSinDesborde`), pero el aviso ayuda
   * a corregir la causa en lugar de dejar contenido recortado.
   */
  elementosDesbordados(): string[] {
    const documento = this.documento;
    const ancho = documento.documentElement.clientWidth;
    const contenido = documento.querySelector('.contenido-principal');
    if (!contenido || !documento.body.classList.contains(CLASE_VISITAS)) {
      return [];
    }
    const todos = [...contenido.querySelectorAll<HTMLElement>('*')].filter((elemento) => {
      const caja = elemento.getBoundingClientRect();
      if (caja.width === 0) {
        return false;
      }
      const vista = documento.defaultView;
      const contenidoVisible = vista?.getComputedStyle(elemento).overflowX === 'visible';
      const fin = caja.left + Math.max(caja.width, contenidoVisible ? elemento.scrollWidth : 0);
      return fin > ancho + 1;
    });
    // Solo los más internos: son los que causan el desborde; sus contenedores solo lo heredan.
    return todos
      .filter((elemento) => !todos.some((otro) => otro !== elemento && elemento.contains(otro)))
      .slice(0, 10)
      .map((elemento) => {
        const clases = typeof elemento.className === 'string' ? elemento.className.trim() : '';
        const nombre =
          elemento.tagName.toLowerCase() + (clases ? '.' + clases.split(/\s+/).join('.') : '');
        const fin = Math.round(elemento.getBoundingClientRect().left + elemento.scrollWidth);
        return `${nombre} (llega a ${fin}px, pantalla ${ancho}px)`;
      });
  }

  private programarRevisionDesborde(): void {
    if (!isDevMode() || typeof setTimeout === 'undefined') {
      return;
    }
    if (this.revisionDesborde !== null) {
      clearTimeout(this.revisionDesborde);
    }
    // Después de que lleguen los datos y se dibuje la pantalla.
    this.revisionDesborde = setTimeout(() => {
      this.revisionDesborde = null;
      const culpables = this.elementosDesbordados();
      if (culpables.length > 0) {
        console.warn(
          '[EstilosVisita] Elementos más anchos que la pantalla:\n' + culpables.join('\n'),
        );
      }
    }, 2000);
  }

  /** Clases para un título. Ej.: `<h2 [class]="estilos.claseTitulo(2)">`. */
  claseTitulo(nivel: NivelTitulo): string {
    return `ssj-titulo ssj-titulo--${nivel}`;
  }

  /** Etiqueta que corresponde al nivel (1 → h1). */
  etiquetaTitulo(nivel: NivelTitulo): EstiloTitulo['etiqueta'] {
    return TITULOS_SSJ[nivel].etiqueta;
  }

  /** Color de la guía en hexadecimal, para código que no usa CSS (ej. el marcador del mapa). */
  color(nombre: ColorSsj): string {
    return COLORES_SSJ[nombre];
  }

  /** `var(--ssj-...)` de un color, para estilos en línea o `[style.color]`. */
  variable(nombre: ColorSsj): string {
    return `var(${nombreVariable(nombre)})`;
  }

  /** Clases de la etiqueta de un estado de visita. Ej.: `<span [class]="estilos.claseEstado(fila.nombreEstado)">`. */
  claseEstado(estado: string | null | undefined): string {
    return `ssj-estado ssj-estado--${tonoEstadoVisita(estado)}`;
  }

  /**
   * Clases del botón de la guía (píldora). Por defecto: borde azul, se rellena al pasar el mouse.
   * `relleno` lo deja relleno siempre (acción principal); `bloque` lo pone a todo el ancho.
   */
  claseBoton(
    opciones: {
      variante?: 'primario' | 'exito' | 'peligro';
      relleno?: boolean;
      bloque?: boolean;
      pequeno?: boolean;
    } = {},
  ): string {
    const clases = ['ssj-boton'];
    if (opciones.variante && opciones.variante !== 'primario') {
      clases.push(`ssj-boton--${opciones.variante}`);
    }
    if (opciones.relleno) {
      clases.push('ssj-boton--relleno');
    }
    if (opciones.bloque) {
      clases.push('ssj-boton--bloque');
    }
    if (opciones.pequeno) {
      clases.push('ssj-boton--pequeno');
    }
    return clases.join(' ');
  }

  /** Activa los estilos en `/visita/...` y los quita en el resto de la aplicación. */
  sincronizar(url: string): void {
    this.documento.body?.classList.toggle(CLASE_VISITAS, RUTA_VISITAS.test(url));
  }

  /** CSS completo que aplica el servicio. Público para poder probarlo. */
  hojaDeEstilos(): string {
    return [
      this.fuentes(),
      this.variables(),
      this.reglasTitulos(),
      this.reglasEstados(),
      this.reglasBotones(),
      this.reglasSinDesborde(),
    ].join('\n');
  }

  private insertarHoja(): void {
    const head = this.documento.head;
    if (!head || this.documento.getElementById(ID_HOJA)) {
      return;
    }
    const hoja = this.documento.createElement('style');
    hoja.id = ID_HOJA;
    hoja.textContent = this.hojaDeEstilos();
    head.appendChild(hoja);
  }

  private fuentes(): string {
    return ARCHIVOS_FUENTE.map(
      ([peso, archivo]) =>
        `@font-face { font-family: 'Nunito Sans'; font-style: normal; font-weight: ${peso}; ` +
        `font-display: swap; src: url('${this.urlFuente(archivo)}') format('truetype'); }`,
    ).join('\n');
  }

  /** Ruta absoluta según `<base href>`, igual que hace `MapComponent` con los assets de ArcGIS. */
  private urlFuente(archivo: string): string {
    const base = this.documento.baseURI || '/';
    return new URL(`assets/fonts/Nunito_Sans/static/${archivo}`, base).href;
  }

  private variables(): string {
    const colores = (Object.keys(COLORES_SSJ) as ColorSsj[])
      .map((nombre) => `${nombreVariable(nombre)}: ${COLORES_SSJ[nombre]};`)
      .join(' ');
    return (
      `${CONTENIDO} { ${colores} --ssj-fuente: ${FUENTE_SSJ}; ` +
      `--bs-body-font-family: var(--ssj-fuente); font-family: var(--ssj-fuente); }`
    );
  }

  /**
   * Cada nivel aplica a su etiqueta (h1, h2, h3) y a `.ssj-titulo--N`.
   * El selector lleva `body` + clase + contenedor para ganarle al CSS de los componentes
   * (`.clase[_ngcontent]`) y al tamaño responsive de Bootstrap.
   */
  private reglasTitulos(): string {
    const reglas = (Object.keys(TITULOS_SSJ) as unknown as `${NivelTitulo}`[]).map((clave) => {
      const nivel = Number(clave) as NivelTitulo;
      const titulo = TITULOS_SSJ[nivel];
      const selector = `${CONTENIDO} ${titulo.etiqueta}, ${CONTENIDO} .ssj-titulo--${nivel}`;
      return (
        `${selector} { font-family: var(--ssj-fuente); font-size: ${titulo.tamano}; ` +
        `font-weight: ${titulo.peso}; color: ${this.variable(titulo.color)}; }`
      );
    });
    // Comunes: interlineado y textos largos sin espacios no deben ensanchar la página.
    const comunes = `${CONTENIDO} :is(h1, h2, h3, .ssj-titulo) { line-height: 1.25; overflow-wrap: anywhere; }`;
    return [...reglas, comunes].join('\n');
  }

  /**
   * Visitas nunca muestra desplazamiento horizontal en la página (requisito de la reunión y del KIT).
   * `clip` y no `hidden`: no crea un contenedor de desplazamiento, así el menú de categorías
   * con `position: sticky` sigue funcionando. Lo que pueda salirse se ajusta al ancho:
   * textos largos sin espacios (URL, nombres de archivo) e imágenes.
   */
  private reglasSinDesborde(): string {
    return [
      `body.${CLASE_VISITAS} { overflow-x: clip; }`,
      `${CONTENIDO} { min-width: 0; max-width: 100%; overflow-x: clip; overflow-wrap: break-word; }`,
      `${CONTENIDO} :is(img, video, iframe) { max-width: 100%; height: auto; }`,
      `${CONTENIDO} :is(input, select, textarea) { max-width: 100%; }`,
    ].join('\n');
  }

  /** Etiqueta redondeada de estado (VIS_TABL). */
  private reglasEstados(): string {
    const base =
      `${CONTENIDO} .ssj-estado { display: inline-block; max-width: 100%; padding: 0.125rem 0.75rem; ` +
      `border-radius: 1rem; font-size: 0.875rem; font-weight: 600; line-height: 1.4; ` +
      `white-space: normal; overflow-wrap: break-word; }`;
    const tonos = (Object.keys(TONOS_ESTADO) as TonoEstado[]).map(
      (tono) =>
        `${CONTENIDO} .ssj-estado--${tono} { background: ${TONOS_ESTADO[tono].fondo}; ` +
        `color: ${TONOS_ESTADO[tono].texto}; }`,
    );
    return [base, ...tonos].join('\n');
  }

  /** Botón píldora de la guía: default, hover, focus y disabled; variantes verde y roja. */
  private reglasBotones(): string {
    const b = `${CONTENIDO} .ssj-boton`;
    return [
      `${b} { --ssj-boton-color: ${COLORES_SSJ.azul}; display: inline-flex; align-items: center; ` +
        `justify-content: center; gap: 0.375rem; max-width: 100%; padding: 0.4375rem 1.25rem; ` +
        `border: 2px solid var(--ssj-boton-color); border-radius: 2rem; background: ${COLORES_SSJ.blanco}; ` +
        `color: var(--ssj-boton-color); font-family: var(--ssj-fuente); font-size: 1rem; font-weight: 700; ` +
        `line-height: 1.25; text-align: center; text-decoration: none; white-space: nowrap; cursor: pointer; ` +
        `transition: background-color 0.15s ease, color 0.15s ease; }`,
      `${b}--exito { --ssj-boton-color: ${COLORES_SSJ.verde}; }`,
      `${b}--peligro { --ssj-boton-color: ${COLORES_SSJ.rojo}; }`,
      `${b}--relleno, ${b}:hover:not(:disabled) { background: var(--ssj-boton-color); color: ${COLORES_SSJ.blanco}; }`,
      `${b}:focus-visible { outline: none; background: var(--ssj-boton-color); color: ${COLORES_SSJ.blanco}; ` +
        `box-shadow: 0 0 0 2px ${COLORES_SSJ.blanco}, 0 0 0 4px ${COLORES_SSJ.negro}; }`,
      `${b}:disabled, ${b}[aria-disabled='true'] { --ssj-boton-color: ${COLORES_SSJ.grisBorde}; ` +
        `background: ${COLORES_SSJ.blanco}; color: ${COLORES_SSJ.grisBorde}; cursor: not-allowed; }`,
      `${b}--bloque { display: flex; width: 100%; }`,
      `${b}--pequeno { padding: 0.25rem 0.875rem; font-size: 0.9375rem; }`,
    ].join('\n');
  }
}
