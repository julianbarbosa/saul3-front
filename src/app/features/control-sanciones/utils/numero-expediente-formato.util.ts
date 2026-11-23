/** Prefijo fijo visible en el campo de búsqueda. */
export const PREFIJO_EXPEDIENTE = '76-001-';

/** Familias admitidas tras el prefijo (multa especial / otro expediente). */
export const DIGITOS_FAMILIA_EXPEDIENTE = ['6', '1'] as const;

/** Ejemplo forma corta: 76-001-6-2026-212456 */
export const EJEMPLO_NUMERO_EXPEDIENTE_CORTO = '76-001-6-2026-212456';

/** Ejemplo forma larga: 76-001-1-x-aaaa-nnnn */
export const EJEMPLO_NUMERO_EXPEDIENTE_LARGO = '76-001-1-2-2026-212456';

export const EJEMPLO_NUMERO_EXPEDIENTE = EJEMPLO_NUMERO_EXPEDIENTE_CORTO;

/**
 * Corta: 76-001-6-2026-212456
 * Larga: 76-001-1-2-2026-212456 (76-001-{6|1}-x-xxxx-xxxx)
 */
const PATRONES_NUMERO_EXPEDIENTE = [
  /^76-001-[61]-\d{4}-\d+$/,
  /^76-001-[61]-\d-\d{4}-\d+$/,
] as const;

export const MAX_DIGITOS_CUERPO_EXPEDIENTE = 15;

export function esNumeroExpedienteFormatoCompleto(valor: string): boolean {
  const texto = (valor ?? '').trim();
  return PATRONES_NUMERO_EXPEDIENTE.some((patron) => patron.test(texto));
}

export function mensajeFormatoNumeroExpedienteInvalido(): string {
  return (
    `Use ${EJEMPLO_NUMERO_EXPEDIENTE_CORTO} o ${EJEMPLO_NUMERO_EXPEDIENTE_LARGO} ` +
    '(76-001-6 o 76-001-1, año de 4 dígitos y consecutivo).'
  );
}

export function quitarPrefijoExpedientePegado(valor: string): string {
  let texto = (valor ?? '').trim();
  while (texto.startsWith(PREFIJO_EXPEDIENTE)) {
    texto = texto.slice(PREFIJO_EXPEDIENTE.length);
  }
  return texto;
}

type VarianteExpediente = 'corta' | 'larga' | 'indeterminada';

function inferirVarianteExpediente(resto: string): VarianteExpediente {
  if (resto.length === 0) {
    return 'indeterminada';
  }
  if (resto[0] !== '2') {
    return 'larga';
  }
  if (resto.length === 1) {
    return 'indeterminada';
  }
  if (resto[1] === '0') {
    return 'corta';
  }
  return 'larga';
}

function formatearVarianteCorta(familia: string, resto: string): string {
  if (resto.length <= 4) {
    return `${PREFIJO_EXPEDIENTE}${familia}-${resto}`;
  }
  const anio = resto.slice(0, 4);
  const consecutivo = resto.slice(4);
  return `${PREFIJO_EXPEDIENTE}${familia}-${anio}${consecutivo ? `-${consecutivo}` : ''}`;
}

function formatearVarianteLarga(familia: string, resto: string): string {
  const x = resto[0];
  const despuesX = resto.slice(1);
  if (despuesX.length === 0) {
    return `${PREFIJO_EXPEDIENTE}${familia}-${x}`;
  }
  if (despuesX.length <= 4) {
    return `${PREFIJO_EXPEDIENTE}${familia}-${x}-${despuesX}`;
  }
  const anio = despuesX.slice(0, 4);
  const consecutivo = despuesX.slice(4);
  return `${PREFIJO_EXPEDIENTE}${familia}-${x}-${anio}${consecutivo ? `-${consecutivo}` : ''}`;
}

export function formatearNumeroExpediente(valor: string): string {
  const digitos = quitarPrefijoExpedientePegado(valor)
    .replace(/\D/g, '')
    .slice(0, MAX_DIGITOS_CUERPO_EXPEDIENTE);

  if (digitos.length === 0) {
    return PREFIJO_EXPEDIENTE;
  }

  const familia = digitos[0];
  if (!esDigitoFamiliaExpedientePermitido(familia)) {
    return PREFIJO_EXPEDIENTE;
  }

  const resto = digitos.slice(1);
  const variante = inferirVarianteExpediente(resto);

  if (variante === 'larga') {
    return formatearVarianteLarga(familia, resto);
  }

  if (variante === 'corta') {
    return formatearVarianteCorta(familia, resto);
  }

  if (resto.length === 0) {
    return `${PREFIJO_EXPEDIENTE}${familia}-`;
  }

  return `${PREFIJO_EXPEDIENTE}${familia}-${resto}`;
}

export function esDigitoFamiliaExpedientePermitido(digito: string): boolean {
  return DIGITOS_FAMILIA_EXPEDIENTE.includes(digito as (typeof DIGITOS_FAMILIA_EXPEDIENTE)[number]);
}