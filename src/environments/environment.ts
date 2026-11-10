export const environment = {
  production: false,
  TYSA_API_URL: 'https://saul-qa.cali.gov.co/tramites-api',
  SAUL3_API_URL: 'http://localhost/saul/saul3/public/api',
  /**
   * saul2 local a través del proxy de `ng serve` (proxy.conf.json → http://127.0.0.1).
   * Así viaja la cookie de sesión de SAUL: inicia sesión en http://localhost/saul antes de usar SsjFront.
   * saul-dev: 'https://saul-dev.cali.gov.co:1443/saul2/app_dev.php'
   */
  SAUL2_API_URL: '/saul2/web/app_dev.php',
  /** Front de SAUL (AngularJS): para abrir historial y observaciones que aún no existen en ssjfront. */
  SAUL1_URL: 'http://localhost/saul/v2/',
  /** Opcional: clave de API de ArcGIS (https://developers.arcgis.com/) */
  ARCGIS_API_KEY: '',
};
