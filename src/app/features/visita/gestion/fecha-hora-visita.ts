/**
 * Conversión de fechas y horas entre los inputs nativos (`type="date"` / `type="time"`)
 * y el formato que SAUL guarda (registrarVisita.js → saveItem):
 * - fecha: `toLocaleString('en-US', { timeZone: 'America/Bogota', year/month/day numeric })` → "10/20/2026"
 * - hora:  `toLocaleString('en-US', { timeZone: 'America/Bogota' })` de un Date del 1/1/1970 → "1/1/1970, 2:30:00 PM"
 */

type ValorCampo = string | number | boolean | null;

const ZONA = 'America/Bogota';
/** Bogotá es UTC-5 todo el año (sin horario de verano). */
const DESFASE_BOGOTA_HORAS = 5;

const FECHA_ISO = /^(\d{4})-(\d{2})-(\d{2})/;
const FECHA_EN_US = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/;
const HORA_24 = /^(\d{1,2}):(\d{2})(?::\d{2})?$/;
const HORA_12 = /(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])/;

/** Valor guardado (ISO, "10/20/2026" o fecha completa) → "2026-10-20" para `<input type="date">`. */
export function fechaParaInput(valor: ValorCampo | undefined): string {
  const texto = textoDe(valor);
  if (!texto) {
    return '';
  }
  const iso = texto.match(FECHA_ISO);
  if (iso) {
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }
  const enUs = texto.match(FECHA_EN_US);
  if (enUs) {
    return `${enUs[3]}-${dosDigitos(enUs[1])}-${dosDigitos(enUs[2])}`;
  }
  const fecha = new Date(texto);
  if (Number.isNaN(fecha.getTime())) {
    return '';
  }
  const partes = partesEnBogota(fecha, { year: 'numeric', month: '2-digit', day: '2-digit' });
  return `${partes['year']}-${partes['month']}-${partes['day']}`;
}

/** Valor guardado ("14:30", "1/1/1970, 2:30:00 PM" o fecha completa) → "14:30" para `<input type="time">`. */
export function horaParaInput(valor: ValorCampo | undefined): string {
  const texto = textoDe(valor);
  if (!texto) {
    return '';
  }
  const h24 = texto.match(HORA_24);
  if (h24) {
    return `${dosDigitos(h24[1])}:${h24[2]}`;
  }
  const h12 = texto.match(HORA_12);
  if (h12) {
    let horas = Number(h12[1]) % 12;
    if (h12[3].toUpperCase() === 'PM') {
      horas += 12;
    }
    return `${dosDigitos(String(horas))}:${h12[2]}`;
  }
  const fecha = new Date(texto);
  if (Number.isNaN(fecha.getTime())) {
    return '';
  }
  const partes = partesEnBogota(fecha, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return `${partes['hour']}:${partes['minute']}`;
}

/** Lo que envía SAUL para un campo `fecha`. "2026-10-20" → "10/20/2026" (el día elegido, sin corrimiento). */
export function fechaParaSaul(valor: ValorCampo): ValorCampo {
  const texto = textoDe(valor);
  const iso = texto.match(FECHA_ISO);
  if (iso && texto.length === 10) {
    // Mediodía UTC: en Bogotá sigue siendo el mismo día.
    const fecha = new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12));
    return fecha.toLocaleString('en-US', { timeZone: ZONA, year: 'numeric', month: 'numeric', day: 'numeric' });
  }
  return formatearInstante(valor, { timeZone: ZONA, year: 'numeric', month: 'numeric', day: 'numeric' });
}

/** Lo que envía SAUL para un campo `hora`. "14:30" → "1/1/1970, 2:30:00 PM", como el `type="time"` de SAUL. */
export function horaParaSaul(valor: ValorCampo): ValorCampo {
  const texto = textoDe(valor);
  const h24 = texto.match(HORA_24);
  if (h24) {
    const fecha = new Date(Date.UTC(1970, 0, 1, Number(h24[1]) + DESFASE_BOGOTA_HORAS, Number(h24[2])));
    return fecha.toLocaleString('en-US', { timeZone: ZONA });
  }
  return formatearInstante(valor, { timeZone: ZONA });
}

/** Comportamiento anterior, para valores que no vienen del input nativo. */
function formatearInstante(valor: ValorCampo, options: Intl.DateTimeFormatOptions): ValorCampo {
  if (valor === null || valor === '' || typeof valor === 'boolean') {
    return valor;
  }
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) {
    return valor;
  }
  return fecha.toLocaleString('en-US', options);
}

function partesEnBogota(fecha: Date, opciones: Intl.DateTimeFormatOptions): Record<string, string> {
  return Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: ZONA, ...opciones })
      .formatToParts(fecha)
      .map((parte) => [parte.type, parte.value]),
  );
}

function textoDe(valor: ValorCampo | undefined): string {
  if (valor === null || valor === undefined || typeof valor === 'boolean') {
    return '';
  }
  return String(valor).trim();
}

function dosDigitos(texto: string): string {
  return texto.padStart(2, '0');
}
