import {
  FORM_VIEWER_DEFAULT_CURRENCY,
  FORM_VIEWER_DEFAULT_LOCALE,
  FORM_VIEWER_EMPTY_TEXT,
  FormViewerField,
} from './form-viewer-field';

export function parseFormViewerFields(json: string): FormViewerField[] {
  const trimmed = json.trim();
  if (!trimmed) {
    return [];
  }
  const parsed: unknown = JSON.parse(trimmed);
  if (!Array.isArray(parsed)) {
    throw new Error('La configuración de form-viewer debe ser un arreglo JSON.');
  }
  return parsed as FormViewerField[];
}

export function clampColMd(colMd: number | undefined): number {
  const value = colMd ?? 12;
  return Math.min(12, Math.max(1, Math.round(value)));
}

export function isFormViewerValueEmpty(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string' && value.trim() === '') {
    return true;
  }
  return false;
}

function localeFromField(field: FormViewerField): string {
  return field.format?.trim() || FORM_VIEWER_DEFAULT_LOCALE;
}

function parseYmdLocal(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) {
    return null;
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'string') {
    const ymd = parseYmdLocal(value);
    if (ymd) {
      return ymd;
    }
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function formatDateValue(value: unknown, locale: string): string {
  if (typeof value === 'string') {
    const ymd = parseYmdLocal(value);
    if (ymd) {
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(ymd);
    }
  }
  const date = toDate(value);
  if (!date) {
    return String(value);
  }
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function formatTimeValue(value: unknown, locale: string): string {
  if (typeof value === 'string') {
    const hhmm = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
    if (hhmm) {
      const h = hhmm[1].padStart(2, '0');
      const m = hhmm[2];
      const s = hhmm[3];
      return s ? `${h}:${m}:${s}` : `${h}:${m}`;
    }
  }
  const date = toDate(value);
  if (!date) {
    return String(value);
  }
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function formatDateTimeValue(value: unknown, locale: string): string {
  const date = toDate(value);
  if (!date) {
    return String(value);
  }
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function formatNumberValue(value: unknown, field: FormViewerField): string {
  const num = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(num)) {
    return String(value);
  }
  const locale = localeFromField(field);
  let options: Intl.NumberFormatOptions = {};
  if (field.format) {
    try {
      options = JSON.parse(field.format) as Intl.NumberFormatOptions;
    } catch {
      options = {};
    }
  }
  return new Intl.NumberFormat(locale, options).format(num);
}

function formatCurrencyValue(value: unknown, field: FormViewerField): string {
  const num = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(num)) {
    return String(value);
  }
  const locale = FORM_VIEWER_DEFAULT_LOCALE;
  const currency =
    field.format && field.format.length === 3 ? field.format.toUpperCase() : FORM_VIEWER_DEFAULT_CURRENCY;
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(num);
}

function formatBooleanValue(value: unknown): string {
  return value === true || value === 'true' || value === 1 || value === '1' ? 'Sí' : 'No';
}

export function formatFormViewerFieldValue(field: FormViewerField): string {
  const emptyText = field.emptyText ?? FORM_VIEWER_EMPTY_TEXT;
  if (isFormViewerValueEmpty(field.value)) {
    return emptyText;
  }

  const locale = localeFromField(field);

  switch (field.type) {
    case 'boolean':
      return formatBooleanValue(field.value);
    case 'date':
      return formatDateValue(field.value, locale);
    case 'time':
      return formatTimeValue(field.value, locale);
    case 'datetime':
      return formatDateTimeValue(field.value, locale);
    case 'number':
      return formatNumberValue(field.value, field);
    case 'currency':
      return formatCurrencyValue(field.value, field);
    case 'html':
      return '';
    case 'text':
    default:
      return String(field.value);
  }
}

export function rawHtmlForFormViewerField(field: FormViewerField): string | null {
  if (field.type !== 'html') {
    return null;
  }
  const emptyText = field.emptyText ?? FORM_VIEWER_EMPTY_TEXT;
  if (isFormViewerValueEmpty(field.value)) {
    return emptyText;
  }
  return String(field.value);
}