import { VisitaCampo, VisitaCategoria, VisitaTabla } from '../interfaces/visita.interface';
import { FormatoTextoService } from './formato-texto.service';

describe('FormatoTextoService', () => {
  let servicio: FormatoTextoService;

  beforeEach(() => {
    servicio = new FormatoTextoService();
  });

  it.each([
    ['SOLICITUD DE SUBSIDIO DE VIVIENDA', 'Solicitud de Subsidio de Vivienda'],
    ['INFORMACION GENERAL', 'Información General'],
    ['datos del solicitante', 'Datos del Solicitante'],
    ['de la vivienda', 'De la Vivienda'],
    ['  ubicacion   de   la   visita ', 'Ubicación de la Visita'],
    ['NUMERO DE IDENTIFICACION:', 'Número de Identificación:'],
    ['CESION DE VIAS', 'Cesión de Vías'],
    ['VIVIENDA V.I.P.', 'Vivienda V.I.P.'],
    ['vivienda v.i.p.', 'Vivienda V.I.P.'],
    ['Datos Básicos', 'Datos Básicos'],
    ['Direccion del predio', 'Dirección del predio'],
    ['Subsidio V.i.p.', 'Subsidio V.I.P.'],
    ['Consulta en Saul', 'Consulta en SAUL'],
    ['FOTO No. 1', 'Foto No. 1'],
    ['No. DE PISOS', 'No. de Pisos'],
    ['No. DE UNIDADES DE VIVIENDA Y/O LOCALES', 'No. de Unidades de Vivienda y/o Locales'],
    ['ALTURA SÓTANO (mts)', 'Altura Sótano (mts)'],
    ['AREA UAR (mt2)', 'Área UAR (mt2)'],
    ['ALTURA MÁXIMA CERRAMIENTO PERIMETRAL (mt)', 'Altura Máxima Cerramiento Perimetral (mt)'],
    ['ITEM3', 'Ítem3'],
  ])('%j → %j', (entrada, esperado) => {
    expect(servicio.formatearTitulo(entrada)).toBe(esperado);
  });

  it('devuelve vacío para null, undefined o texto en blanco', () => {
    expect(servicio.formatearTitulo(null)).toBe('');
    expect(servicio.formatearTitulo(undefined)).toBe('');
    expect(servicio.formatearTitulo('   ')).toBe('');
  });

  it('detecta si un texto trae tilde', () => {
    expect(servicio.tieneTilde('Información')).toBe(true);
    expect(servicio.tieneTilde('Año')).toBe(true);
    expect(servicio.tieneTilde('Informacion')).toBe(false);
  });

  it('formatea el formulario en el lugar, sin romper los objetos compartidos ni tocar codigo/valor', () => {
    const campo: VisitaCampo = {
      id: 1,
      codigo: 'v6_cesion',
      nombre: 'CESION DE VIAS',
      tipo: 'texto-min',
      label: 'VALOR',
      dominio: null,
      opciones: null,
      descripcion: null,
      soloLectura: false,
      valor: 'SIN INFORMACION',
    };
    const tabla: VisitaTabla = {
      encabezados: ['ITEM', 'VALOR'],
      tituloIndependiente: true,
      filas: [{ titulo: 'CESION DE VIAS', celdas: [campo] }],
    };
    const categorias: VisitaCategoria[] = [
      {
        id: 1,
        nombre: 'INFORMACION GENERAL',
        posicion: 1,
        descripcion: null,
        creadoEn: null,
        actualizadoEn: null,
        campos: [campo],
        tabla,
        bloques: [{ tabla, campos: [] }],
      },
    ];

    const resultado = servicio.formatearFormulario(categorias);

    expect(resultado[0].nombre).toBe('Información General');
    expect(tabla.encabezados).toEqual(['Ítem', 'Valor']);
    expect(tabla.filas[0].titulo).toBe('Cesión de Vías');
    expect(tabla.filas[0].celdas[0]).toBe(resultado[0].campos[0]);
    expect(campo.nombre).toBe('Cesión de Vías');
    expect(campo.label).toBe('Valor');
    expect(campo.codigo).toBe('v6_cesion');
    expect(campo.valor).toBe('SIN INFORMACION');
  });
});
