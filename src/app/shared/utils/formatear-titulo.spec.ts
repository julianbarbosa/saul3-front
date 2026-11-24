import { TituloPipe } from '../pipes/titulo.pipe';
import { formatearTitulo } from './formatear-titulo';

describe('formatearTitulo', () => {
  it.each([
    ['SOLICITUD DE SUBSIDIO DE VIVIENDA', 'Solicitud de Subsidio de Vivienda'],
    ['solicitud de subsidio de vivienda', 'Solicitud de Subsidio de Vivienda'],
    ['datos del solicitante', 'Datos del Solicitante'],
    ['de la vivienda', 'De la Vivienda'],
    ['  información   general ', 'Información General'],
    ['registro SAUL', 'Registro SAUL'],
    ['NÚMERO DE UNIDADES DE VIVIENDA Y/O LOCALES', 'Número de Unidades de Vivienda y/o Locales'],
    ['IMÁGENES-ESQUEMAS-PLANOS', 'Imágenes-Esquemas-Planos'],
    ['AÑO DE CONSTRUCCIÓN (NIT)', 'Año de Construcción (NIT)'],
    ['Gestión Acceso Justicia', 'Gestión Acceso Justicia'],
    ['DATOS TÉCNICOS DEL PROYECTO SEGÚN POT', 'Datos Técnicos del Proyecto Según POT'],
    ['VIVIENDA V.I.P.', 'Vivienda V.I.P.'],
    ['subsidio v.i.p. de vivienda', 'Subsidio V.I.P. de Vivienda'],
    ['proyecto VIP', 'Proyecto VIP'],
    ['ALTURA DE PISO (MTS)', 'Altura de Piso (mts)'],
    ['No. PARQUEADEROS PRIVADOS', 'No. Parqueaderos Privados'],
  ])('%j → %j', (entrada, esperado) => {
    expect(formatearTitulo(entrada)).toBe(esperado);
  });

  it('devuelve vacío para null, undefined o texto en blanco', () => {
    expect(formatearTitulo(null)).toBe('');
    expect(formatearTitulo(undefined)).toBe('');
    expect(formatearTitulo('   ')).toBe('');
  });

  it('acepta otra lista de siglas', () => {
    expect(formatearTitulo('consulta pot y dane', ['POT'])).toBe('Consulta POT y Dane');
  });

  it('el pipe titulo usa la misma función', () => {
    expect(new TituloPipe().transform('VERIFICACIÓN DE PAGOS')).toBe('Verificación de Pagos');
    expect(new TituloPipe().transform(null)).toBe('');
  });
});
