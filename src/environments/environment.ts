export const environment = {
  production: false,
  TYSA_API_URL: 'https://saul-qa.cali.gov.co/tramites-api',
  SAUL3_API_URL: 'http://localhost:8000/api',

  /** Front de SAUL (AngularJS): para abrir historial y observaciones que aún no existen en ssjfront. */
  /** Opcional: clave de API de ArcGIS (https://developers.arcgis.com/) */
  ARCGIS_API_KEY: '',

  /** reCAPTCHA v3 — alineado con RECAPTCHA_* del backend SAUL3. */
  RECAPTCHA_ENABLED: false,
  RECAPTCHA_SITE_KEY: '6LerDs0tAAAAAMmSbQaIto2im3nkv6vBZfqUpvtR',
  RECAPTCHA_ACTION: 'api_access',
};
