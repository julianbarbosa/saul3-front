/** Palabras de enlace que van en minúscula salvo al inicio del título. */
const PALABRAS_ENLACE = new Set([
  'de',
  'del',
  'la',
  'las',
  'el',
  'los',
  'y',
  'e',
  'o',
  'u',
  'a',
  'al',
  'en',
  'con',
  'por',
  'para',
  'sin',
  'sobre',
  'un',
  'una',
]);

/** Siglas que se escriben siempre como aparecen aquí. */
export const SIGLAS_TITULO: readonly string[] = ['SAUL', 'DANE', 'NIT', 'ID', 'POT', 'VIP', 'UAR'];

/** Unidades de medida: siempre en minúscula ("(MTS)" → "(mts)"). */
const UNIDADES = new Set(['m', 'mt', 'mts', 'm2', 'mt2', 'mts2', 'm3', 'cm', 'km', 'ha']);

/** "No." de número: se escribe siempre "No.". */
const ABREVIATURA_NUMERO = 'no';

/**
 * true si el texto viene todo en mayúsculas o todo en minúsculas, sin contar las
 * unidades ("(mts)") ni la abreviatura "No.": "No. DE PISOS" y "ALTURA (mts)" cuentan como mayúsculas.
 */
export function vieneSinCaja(texto: string): boolean {
  const significativas = texto
    .split(/[\s\-/]+/)
    .map((palabra) => palabra.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter((nucleo) => {
      const clave = nucleo.toLocaleLowerCase('es');
      return nucleo && !UNIDADES.has(clave) && clave !== ABREVIATURA_NUMERO;
    })
    .join('');
  return (
    significativas === significativas.toLocaleUpperCase('es') ||
    significativas === significativas.toLocaleLowerCase('es')
  );
}

/** Letras sueltas separadas por punto ("V.i.p", "s.a.s"): siempre en mayúscula. */
const SIGLA_CON_PUNTOS = /^(?:\p{L}\.)+\p{L}$/u;

/**
 * Pone en mayúscula solo las siglas (las de la lista y las que llevan puntos, ej. "V.i.p." → "V.I.P.")
 * sin tocar el resto. Para textos con mayúsculas y minúsculas que se respetan tal como vienen.
 */
export function corregirSiglas(texto: string, siglas: readonly string[] = SIGLAS_TITULO): string {
  const siglasPorClave = new Map(siglas.map((sigla) => [sigla.toLocaleUpperCase('es'), sigla]));
  return texto
    .split(' ')
    .map((palabra) => {
      const [, antes = '', nucleo = '', despues = ''] = palabra.match(/^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u) ?? [];
      const sigla = siglaDe(nucleo, siglasPorClave);
      return sigla ? antes + sigla + despues : palabra;
    })
    .join(' ');
}

function siglaDe(nucleo: string, siglas: Map<string, string>): string | null {
  if (!nucleo) {
    return null;
  }
  if (SIGLA_CON_PUNTOS.test(nucleo)) {
    return nucleo.toLocaleUpperCase('es');
  }
  return siglas.get(nucleo.toLocaleUpperCase('es')) ?? null;
}

/**
 * Tipo título en español: "SOLICITUD DE SUBSIDIO DE VIVIENDA" → "Solicitud de Subsidio de Vivienda".
 * Las partes unidas por "-" o "/" se tratan como palabras ("y/o", "Imágenes-Esquemas").
 */
export function formatearTitulo(texto: string | null | undefined, siglas: readonly string[] = SIGLAS_TITULO): string {
  const limpio = (texto ?? '').replace(/\s+/g, ' ').trim();
  if (!limpio) {
    return '';
  }
  const siglasPorClave = new Map(siglas.map((sigla) => [sigla.toLocaleUpperCase('es'), sigla]));
  return limpio
    .split(' ')
    .map((palabra, indice) =>
      palabra
        .split(/([-/])/)
        .map((parte, posicion) =>
          posicion % 2 === 1 ? parte : formatearParte(parte, indice === 0 && posicion === 0, siglasPorClave),
        )
        .join(''),
    )
    .join(' ');
}

function formatearParte(parte: string, esPrimera: boolean, siglas: Map<string, string>): string {
  const [, antes = '', nucleo = '', despues = ''] = parte.match(/^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u) ?? [];
  if (!nucleo) {
    return parte;
  }
  const sigla = siglaDe(nucleo, siglas);
  if (sigla) {
    return antes + sigla + despues;
  }
  const minuscula = nucleo.toLocaleLowerCase('es');
  if (UNIDADES.has(minuscula)) {
    return antes + minuscula + despues;
  }
  if (!esPrimera && PALABRAS_ENLACE.has(minuscula)) {
    return antes + minuscula + despues;
  }
  return antes + minuscula.charAt(0).toLocaleUpperCase('es') + minuscula.slice(1) + despues;
}
