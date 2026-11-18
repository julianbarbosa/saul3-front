/**
 * Campos obligatorios del formulario de gestión de visitas, por tipo de control.
 *
 * El API (SAUL2 `/visita/generar/{id}`) no envía hoy una marca de obligatoriedad, así que
 * se resuelve en el front comparando el label / nombre / código de cada campo contra estas
 * listas, de forma tolerante a tildes, mayúsculas, signos y palabras vacías
 * («Fecha de visita» ≡ «fecha visita» ≡ «FECHA_VISITA»).
 *
 * Cada requisito admite alias: basta con que el campo coincida con uno de ellos.
 * Si el API envía `parametros.requerido`, esa marca prevalece (ver VisitaLimpiaService).
 */

export type TipoControlVisita = 'preventivo' | 'posterior';

/** Un requisito = lista de nombres equivalentes para el mismo campo. */
type RequisitoCampo = readonly string[];

const CAMPOS_OBLIGATORIOS: Readonly<Record<TipoControlVisita, readonly RequisitoCampo[]>> = {
  preventivo: [
    ['dirección'],
    ['propietario'],
    ['identificación'],
    ['barrio', 'nombre barrio'],
    ['comuna'],
    ['código barrio'],
    ['corregimiento', 'nombre corregimiento'],
    ['vereda'],
    ['solicitado mediante'],
    ['número predial nacional', 'npn'],
    ['estrato'],
    ['número de predio'],
    ['matrícula inmobiliaria'],
    ['fecha de visita'],
    ['hora de visita'],
    ['nombre atiende visita', 'nombre persona atiende'],
    ['observación proceso constructivo', 'observaciones proceso constructivo'],
    ['destinación predio'],
    ['pisos edificación'],
    ['existe proceso constructivo y/o demolición'],
    ['determina infracciones urbanísticas'],
    ['respuesta a solicitante'],
  ],
  posterior: [
    ['nombre proyecto'],
    ['nombre titular'],
    ['identificación'],
    ['dirección'],
    ['código barrio'],
    ['nombre barrio', 'barrio'],
    ['matrícula inmobiliaria'],
    ['nombre corregimiento', 'corregimiento'],
    ['comuna'],
    ['localización predio'],
    ['tipo licencia urbanística'],
    ['estrato'],
    ['npn', 'número predial nacional'],
    ['funcionario visitador'],
    ['fecha visita'],
    ['hora visita'],
    ['nombre persona atiende', 'nombre atiende visita'],
    ['observaciones proceso constructivo', 'observación proceso constructivo'],
    ['respuesta a solicitante'],
  ],
};

/** Palabras que no aportan al nombre del campo y se ignoran al comparar. */
const PALABRAS_VACIAS: ReadonlySet<string> = new Set([
  'a',
  'al',
  'de',
  'del',
  'el',
  'en',
  'la',
  'las',
  'los',
  'o',
  'y',
]);

/**
 * Normaliza un nombre de campo para comparación:
 * sin tildes, minúsculas, solo alfanuméricos, sin palabras vacías y espacios simples.
 */
export function normalizarNombreCampo(texto: string | null | undefined): string {
  if (!texto) {
    return '';
  }
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((palabra) => palabra.length > 0 && !PALABRAS_VACIAS.has(palabra))
    .join(' ');
}

/** Índice normalizado (precalculado una sola vez): tipo → requisitos → alias normalizados. */
const INDICE_OBLIGATORIOS: Readonly<Record<TipoControlVisita, readonly ReadonlySet<string>[]>> = {
  preventivo: CAMPOS_OBLIGATORIOS.preventivo.map((r) => new Set(r.map(normalizarNombreCampo))),
  posterior: CAMPOS_OBLIGATORIOS.posterior.map((r) => new Set(r.map(normalizarNombreCampo))),
};

const TIPOS_CONTROL: readonly TipoControlVisita[] = ['preventivo', 'posterior'];

/**
 * Determina qué conjunto de nombres obligatorios aplica a un formulario.
 *
 * - Con `tipo` explícito se usa ese conjunto.
 * - Sin tipo, se elige el conjunto con más requisitos presentes en el formulario.
 *   En empate (> 0) se usa la unión de ambos, para no dejar sin validar un campo exigido.
 *   Si ningún requisito aparece, no hay obligatorios.
 *
 * @param nombresCampo nombres ya normalizados (label, nombre y código de cada campo).
 */
export function resolverNombresObligatorios(
  nombresCampo: ReadonlySet<string>,
  tipo?: TipoControlVisita | null,
): ReadonlySet<string> {
  const aplanar = (tipos: readonly TipoControlVisita[]): ReadonlySet<string> =>
    new Set(tipos.flatMap((t) => INDICE_OBLIGATORIOS[t].flatMap((alias) => [...alias])));

  if (tipo) {
    return aplanar([tipo]);
  }

  const puntaje = (t: TipoControlVisita): number =>
    INDICE_OBLIGATORIOS[t].filter((alias) => [...alias].some((a) => nombresCampo.has(a))).length;

  const [preventivo, posterior] = TIPOS_CONTROL.map(puntaje);

  if (preventivo === 0 && posterior === 0) {
    return new Set();
  }
  if (preventivo === posterior) {
    return aplanar(TIPOS_CONTROL);
  }
  return aplanar([preventivo > posterior ? 'preventivo' : 'posterior']);
}

/** Interpreta la marca `requerido` que pueda enviar el API (true, 1, '1', 'true', 'si'). */
export function esMarcaRequerido(valor: unknown): boolean {
  if (typeof valor === 'boolean') {
    return valor;
  }
  if (typeof valor === 'number') {
    return valor === 1;
  }
  if (typeof valor === 'string') {
    return ['1', 'true', 'si', 'sí'].includes(valor.trim().toLowerCase());
  }
  return false;
}

/**
 * Tipo de control a partir del tipo de visita de SAUL (`tipoVisita.descripcion` o `codigo`).
 * Devuelve null si no se reconoce; en ese caso se infiere por los campos del formulario.
 */
export function tipoControlDesdeTexto(
  ...textos: (string | null | undefined)[]
): TipoControlVisita | null {
  const texto = textos.map(normalizarNombreCampo).join(' ');
  if (/\bpreventiv/.test(texto)) {
    return 'preventivo';
  }
  if (/\bposterior/.test(texto)) {
    return 'posterior';
  }
  return null;
}
