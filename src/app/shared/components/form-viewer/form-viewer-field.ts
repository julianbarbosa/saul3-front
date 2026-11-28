export type FormViewerFieldType =
  | 'text'
  | 'date'
  | 'time'
  | 'datetime'
  | 'number'
  | 'currency'
  | 'boolean'
  | 'html';

export interface FormViewerField {
  label: string;
  value: unknown;
  type: FormViewerFieldType;
  /** Ancho en columnas Bootstrap (1–12). Por defecto: 12. */
  colMd?: number;
  /**
   * Formato opcional: locale (`es-CO`), patrón de moneda (`COP`) o opciones JSON para `Intl`.
   */
  format?: string;
  /** Texto cuando el valor está vacío. Por defecto: `-`. */
  emptyText?: string;
}

export const FORM_VIEWER_EMPTY_TEXT = '-';

export const FORM_VIEWER_DEFAULT_LOCALE = 'es-CO';

export const FORM_VIEWER_DEFAULT_CURRENCY = 'COP';