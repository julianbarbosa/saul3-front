import { VisitaCampo, VisitaDetalle, VisitaFormularioCategoriaRaw } from '../interfaces/visita.interface';
import { cuerpoImagenVisita } from './visita.service';
import { configuracionVisita } from '../../features/visita/gestion/configuracion-visita';
import { serializarValorVisita, VisitaLimpiaService } from './visita-limpia.service';

function campo(
  parcial: Partial<VisitaFormularioCategoriaRaw['arrayItems'][number]['item']['items'][number]> & {
    codigo: string;
    nombre: string;
  },
): VisitaFormularioCategoriaRaw['arrayItems'][number]['item']['items'][number] {
  return {
    idItemVisita: parcial.idItemVisita ?? 1,
    descripcion: null,
    tipoItem: 'texto-min',
    parametros: null,
    soloLectura: 0,
    valor: null,
    ...parcial,
  };
}

describe('VisitaLimpiaService', () => {
  const servicio = new VisitaLimpiaService();

  it('arma tabla por estructura sin encabezados ni configuración y conserva cada campo', () => {
    const categorias = servicio.limpiar([
      {
        idCategoriaItem: 8,
        nombre: 'Verificaciones urbanísticas y chequeo en obra',
        descripcion: null,
        posicion: 1,
        arrayItems: [
          {
            item: {
              nombre: 'Vía de acceso al predio',
              items: [
                campo({
                  idItemVisita: 2,
                  codigo: 'v6_via_acceso_verificado_en_obra',
                  nombre: 'Vía de acceso al predio',
                  valor: 0,
                }),
                campo({
                  idItemVisita: 1,
                  codigo: 'v6_via_acceso_aprobado_en_planos',
                  nombre: 'Vía de acceso al predio',
                  valor: '',
                }),
              ],
            },
          },
          {
            item: {
              nombre: 'Número de unidades de vivienda y/o locales',
              items: [
                campo({
                  idItemVisita: 3,
                  codigo: 'v6_unidades_aprobado_en_planos',
                  nombre: 'Número de unidades de vivienda y/o locales',
                  valor: '1.50',
                }),
                campo({
                  idItemVisita: 4,
                  codigo: 'v6_unidades_verificado_en_obra',
                  nombre: 'Número de unidades de vivienda y/o locales',
                  valor: null,
                }),
              ],
            },
          },
        ],
      },
    ]);

    const tabla = categorias[0].tabla;
    expect(tabla?.encabezados).toEqual(['Ítem', '', '']);
    expect(tabla?.tituloIndependiente).toBe(true);
    expect(tabla?.filas.map((fila) => fila.titulo)).toEqual([
      'Vía de acceso al predio',
      'Número de unidades de vivienda y/o locales',
    ]);
    expect(tabla?.filas.flatMap((fila) => fila.celdas)).toEqual(categorias[0].campos);
    expect(categorias[0].campos.map((item) => [item.codigo, item.valor, item.nombre])).toEqual([
      ['v6_via_acceso_verificado_en_obra', 0, 'Vía de acceso al predio'],
      ['v6_via_acceso_aprobado_en_planos', '', 'Vía de acceso al predio'],
      ['v6_unidades_aprobado_en_planos', '1.50', 'Número de unidades de vivienda y/o locales'],
      ['v6_unidades_verificado_en_obra', null, 'Número de unidades de vivienda y/o locales'],
    ]);
    expect(new Set(categorias[0].campos).size).toBe(4);
  });

  it('conserva el orden de una tabla que no es de planos y obra', () => {
    const categorias = servicio.limpiar([
      {
        idCategoriaItem: 3,
        nombre: 'Porcentajes',
        descripcion: null,
        posicion: 2,
        arrayDescripcion: ['Concepto', 'Valor', 'Nota'],
        arrayItems: [
          {
            item: {
              nombre: 'Excavación',
              items: [
                campo({
                  idItemVisita: 10,
                  codigo: 'v6_porcentaje_excavacion',
                  nombre: 'Excavación',
                  tipoItem: 'numero',
                  valor: 0,
                }),
                campo({
                  idItemVisita: 11,
                  codigo: 'v6_nota_excavacion',
                  nombre: 'Excavación',
                  parametros: { label: 'Nota' },
                  valor: null,
                }),
              ],
            },
          },
        ],
      },
    ]);

    expect(categorias[0].tabla?.encabezados).toEqual(['Concepto', 'Valor', 'Nota']);
    expect(categorias[0].tabla?.tituloIndependiente).toBe(true);
    expect(categorias[0].tabla?.filas[0].titulo).toBe('Excavación');
    expect(categorias[0].tabla?.filas[0].celdas.map((celda) => celda?.codigo)).toEqual([
      'v6_porcentaje_excavacion',
      'v6_nota_excavacion',
    ]);
    expect(categorias[0].tabla?.filas[0].celdas[0]).toBe(categorias[0].campos[0]);
    expect(categorias[0].tabla?.filas[0].celdas[0]?.valor).toBe(0);
  });

  it('separa los campos sueltos de las filas que coinciden con los encabezados', () => {
    const categorias = servicio.limpiar([
      {
        idCategoriaItem: 12,
        nombre: 'Revisión',
        descripcion: null,
        posicion: 1,
        arrayDescripcion: ['Ítem', 'Licencia', 'Verificación'],
        arrayItems: [
          {
            item: {
              nombre: 'Concepto A',
              items: [
                campo({ idItemVisita: 1, codigo: 'a_licencia', nombre: 'Concepto A', valor: 0 }),
                campo({ idItemVisita: 2, codigo: 'a_verificacion', nombre: 'Concepto A', valor: '' }),
              ],
            },
          },
          {
            item: {
              nombre: 'Foto',
              items: [
                campo({
                  idItemVisita: 3,
                  codigo: 'foto_fachada',
                  nombre: 'Foto',
                  tipoItem: 'imagen',
                  valor: 'fachada.png',
                }),
              ],
            },
          },
          {
            item: {
              nombre: 'Concepto B',
              items: [
                campo({ idItemVisita: 4, codigo: 'b_licencia', nombre: 'Concepto B', valor: false }),
                campo({ idItemVisita: 5, codigo: 'b_verificacion', nombre: 'Concepto B', valor: '1.50' }),
              ],
            },
          },
        ],
      },
    ]);

    const categoria = categorias[0];
    expect(categoria.bloques?.map((bloque) => bloque.tabla?.filas.map((fila) => fila.titulo) ?? bloque.campos.map((item) => item.codigo))).toEqual([
      ['Concepto A'],
      ['foto_fachada'],
      ['Concepto B'],
    ]);
    expect(categoria.bloques?.[0].tabla?.encabezados).toEqual(['Ítem', 'Licencia', 'Verificación']);
    expect(categoria.bloques?.[0].tabla?.tituloIndependiente).toBe(true);
    expect(categoria.bloques?.[0].tabla?.filas[0].celdas.map((celda) => celda?.codigo)).toEqual([
      'a_licencia',
      'a_verificacion',
    ]);
    expect(categoria.bloques?.[2].tabla?.filas[0].celdas.map((celda) => celda?.valor)).toEqual([false, '1.50']);
    expect(categoria.campos.map((item) => item.codigo)).toEqual([
      'a_licencia',
      'a_verificacion',
      'foto_fachada',
      'b_licencia',
      'b_verificacion',
    ]);
    expect(categoria.campos[2].valor).toBe('fachada.png');
    expect(categoria.campos[2].tipo).toBe('imagen');
    expect(categoria.bloques?.[0].tabla?.filas[0].celdas[0]).toBe(categoria.campos[0]);
    expect(categoria.bloques?.[2].tabla?.filas[0].celdas[1]).toBe(categoria.campos[4]);
    expect(categoria.bloques?.some((bloque) => bloque.tabla?.filas.some((fila) => fila.celdas.includes(categoria.campos[2])))).toBe(
      false,
    );
    expect(new Set(categoria.campos).size).toBe(categoria.campos.length);
  });

  it('arma una fila por concepto con los encabezados de la descripción de SAUL', () => {
    const categorias = servicio.limpiar([
      {
        idCategoriaItem: 49,
        nombre: 'Verificaciones urbanísticas y chequeo en obra',
        descripcion: 'ITEM3,APROBADO EN PLANOS,VERIFICADO EN OBRA',
        posicion: 1,
        arrayItems: [
          {
            item: {
              nombre: 'VÍA DE ACCESO AL PREDIO',
              items: [
                campo({
                  idItemVisita: 1,
                  codigo: 'v6_via_acceso_predio_planos',
                  nombre: 'VÍA DE ACCESO AL PREDIO',
                  valor: '',
                }),
                campo({
                  idItemVisita: 2,
                  codigo: 'v6_via_acceso_predio_obra',
                  nombre: 'VÍA DE ACCESO AL PREDIO',
                  valor: 0,
                }),
              ],
            },
          },
          {
            item: {
              nombre: 'Foto fachada',
              items: [
                campo({
                  idItemVisita: 3,
                  codigo: 'v15_imagen_fachada1',
                  nombre: 'Foto fachada',
                  tipoItem: 'imagen',
                  valor: 'fachada.png',
                }),
              ],
            },
          },
          {
            item: {
              nombre: 'No. DE PISOS',
              items: [
                campo({ idItemVisita: 4, codigo: 'v6_pisos_plano', nombre: 'No. DE PISOS', valor: '1.50' }),
                campo({ idItemVisita: 5, codigo: 'v6_pisos_obra', nombre: 'No. DE PISOS', valor: null }),
              ],
            },
          },
        ],
      },
    ]);

    const bloques = categorias[0].bloques ?? [];
    expect(bloques.map((bloque) => bloque.tabla?.filas.length ?? bloque.campos.length)).toEqual([1, 1, 1]);
    expect(bloques[0].tabla?.encabezados).toEqual(['ITEM3', 'APROBADO EN PLANOS', 'VERIFICADO EN OBRA']);
    expect(bloques[0].tabla?.filas[0].titulo).toBe('VÍA DE ACCESO AL PREDIO');
    expect(bloques[0].tabla?.filas[0].celdas.map((celda) => [celda?.codigo, celda?.valor])).toEqual([
      ['v6_via_acceso_predio_planos', ''],
      ['v6_via_acceso_predio_obra', 0],
    ]);
    expect(bloques[0].tabla?.filas[0].celdas[0]).toBe(categorias[0].campos[0]);
    expect(bloques[1].campos.map((item) => item.codigo)).toEqual(['v15_imagen_fachada1']);
    expect(bloques[2].tabla?.filas[0].celdas.map((celda) => celda?.valor)).toEqual(['1.50', null]);
    expect(categorias[0].campos).toHaveLength(5);
  });

  it('usa encabezados configurados solo donde la API no los trae, con cualquier número de columnas', () => {
    const grupo = (nombre: string, id: number, cantidad: number) => ({
      item: {
        nombre,
        items: Array.from({ length: cantidad }, (_, i) =>
          campo({ idItemVisita: id + i, codigo: `c${id + i}`, nombre, valor: i }),
        ),
      },
    });
    const categorias = servicio.limpiar(
      [
        {
          idCategoriaItem: 70,
          nombre: 'Sin encabezados en la API',
          descripcion: 'Sin encabezados en la API',
          posicion: 1,
          arrayItems: [grupo('Fila A', 1, 3), grupo('Suelto', 10, 1), grupo('Fila B', 20, 3)],
        },
        {
          idCategoriaItem: 71,
          nombre: 'Con encabezados en la API',
          descripcion: 'Concepto,Uno,Dos',
          posicion: 2,
          arrayItems: [grupo('Fila C', 30, 2)],
        },
        {
          idCategoriaItem: 72,
          nombre: 'Sin configuración',
          descripcion: null,
          posicion: 3,
          arrayItems: [grupo('Fila D', 40, 2)],
        },
      ],
      {
        encabezadosPorCategoria: {
          70: ['Ítem', 'Norma', 'Según planos', 'Observaciones'],
          71: ['No', 'se', 'usa'],
        },
      },
    );

    const [configurada, deApi, sinConfiguracion] = categorias;
    expect(configurada.bloques?.map((bloque) => (bloque.tabla ? 'tabla' : 'campos'))).toEqual([
      'tabla',
      'campos',
      'tabla',
    ]);
    expect(configurada.bloques?.[0].tabla?.encabezados).toEqual(['Ítem', 'Norma', 'Según planos', 'Observaciones']);
    expect(configurada.bloques?.[0].tabla?.filas[0].titulo).toBe('Fila A');
    expect(configurada.bloques?.[0].tabla?.filas[0].celdas.map((celda) => celda?.codigo)).toEqual(['c1', 'c2', 'c3']);
    expect(configurada.bloques?.[1].campos.map((item) => item.codigo)).toEqual(['c10']);
    expect(deApi.tabla?.encabezados).toEqual(['Concepto', 'Uno', 'Dos']);
    expect(deApi.tabla?.filas[0].titulo).toBe('Fila C');
    expect(sinConfiguracion.tabla?.encabezados).toEqual(['Ítem', '', '']);
    expect(sinConfiguracion.tabla?.filas[0].celdas.map((celda) => celda?.codigo)).toEqual(['c40', 'c41']);
    expect(sinConfiguracion.campos).toHaveLength(2);
  });

  it('mantiene la columna del título cuando el primer encabezado de SAUL está vacío', () => {
    const categorias = servicio.limpiar([
      {
        idCategoriaItem: 27,
        nombre: 'Obligaciones Urbanisticas',
        descripcion: ',Exigidas en Licencia, Verificación',
        posicion: 1,
        arrayItems: [
          {
            item: {
              nombre: 'Cesión de vías',
              items: [
                campo({ idItemVisita: 1, codigo: 'a1', nombre: 'Cesión de vías', valor: 'x' }),
                campo({ idItemVisita: 2, codigo: 'a2', nombre: 'Cesión de vías', valor: null }),
              ],
            },
          },
        ],
      },
    ]);

    const tabla = categorias[0].tabla;
    expect(tabla?.encabezados).toEqual(['', 'Exigidas en Licencia', 'Verificación']);
    expect(tabla?.tituloIndependiente).toBe(true);
    expect(tabla?.filas[0].titulo).toBe('Cesión de vías');
    expect(tabla?.filas[0].celdas.map((celda) => celda?.codigo)).toEqual(['a1', 'a2']);
  });

  it('arma la tabla de DATOS DE LA VALLA por estructura aunque la descripción sea el nombre de la categoría', () => {
    const valla = (posicion: number, descripcion: string) => ({
      idCategoriaItem: 56,
      nombre: 'DATOS DE LA VALLA',
      descripcion,
      posicion,
      arrayItems: [
        {
          item: {
            nombre: 'CESIÓN DE VÍAS',
            items: [
              campo({ idItemVisita: 565, codigo: 'v6_cesion_vias_licencia', nombre: 'CESIÓN DE VÍAS', valor: '120.5' }),
              campo({ idItemVisita: 566, codigo: 'v6_cesion_vias_verificacion', nombre: 'CESIÓN DE VÍAS', valor: 0 }),
            ],
          },
        },
        {
          item: {
            nombre: 'Funcionario visitador de inspección',
            items: [
              campo({
                idItemVisita: 746,
                codigo: 'v15_funcionario_visitador',
                nombre: 'Funcionario visitador de inspección',
                valor: '',
              }),
            ],
          },
        },
        {
          item: {
            nombre: 'RED DE GAS',
            items: [
              campo({ idItemVisita: 601, codigo: 'v6_red_gas_licencia', nombre: 'RED DE GAS', valor: 'si' }),
              campo({ idItemVisita: 602, codigo: 'v6_red_gas_verificacion', nombre: 'RED DE GAS', valor: null }),
            ],
          },
        },
      ],
    });

    const [deApi, comoLlega] = servicio.limpiar(
      [valla(1, 'Ítem,Aprobado en planos,Verificado en obra'), valla(2, 'DATOS DE LA VALLA')],
      configuracionVisita,
    );
    const [sinConfiguracion] = servicio.limpiar([valla(3, 'DATOS DE LA VALLA')]);

    for (const categoria of [deApi, comoLlega, sinConfiguracion]) {
      const bloques = categoria.bloques ?? [];
      expect(bloques.map((bloque) => (bloque.tabla ? 'tabla' : 'campos'))).toEqual(['tabla', 'campos', 'tabla']);
      expect(bloques[0].tabla?.tituloIndependiente).toBe(true);
      expect(bloques[0].tabla?.filas.map((fila) => fila.titulo)).toEqual(['CESIÓN DE VÍAS']);
      expect(bloques[0].tabla?.filas[0].celdas.map((celda) => [celda?.codigo, celda?.valor])).toEqual([
        ['v6_cesion_vias_licencia', '120.5'],
        ['v6_cesion_vias_verificacion', 0],
      ]);
      expect(bloques[1].campos.map((item) => [item.codigo, item.valor])).toEqual([['v15_funcionario_visitador', '']]);
      expect(bloques[2].tabla?.filas[0].celdas.map((celda) => [celda?.codigo, celda?.valor])).toEqual([
        ['v6_red_gas_licencia', 'si'],
        ['v6_red_gas_verificacion', null],
      ]);
      expect(bloques[2].tabla?.filas[0].celdas[1]).toBe(categoria.campos[4]);
      expect(categoria.campos).toHaveLength(5);
    }

    const encabezados = (categoria: typeof deApi) =>
      (categoria.bloques ?? []).filter((bloque) => bloque.tabla).map((bloque) => bloque.tabla?.encabezados);
    expect(encabezados(deApi)).toEqual([
      ['Ítem', 'Aprobado en planos', 'Verificado en obra'],
      ['Ítem', 'Aprobado en planos', 'Verificado en obra'],
    ]);
    expect(encabezados(comoLlega)).toEqual([
      ['Ítem', 'Aprobado en planos', 'Verificado en obra'],
      ['Ítem', 'Aprobado en planos', 'Verificado en obra'],
    ]);
    expect(encabezados(sinConfiguracion)).toEqual([
      ['Ítem', '', ''],
      ['Ítem', '', ''],
    ]);
  });

  it('convierte en tabla otra categoría con grupos de tres campos iguales al grupo, sin configuración', () => {
    const grupo = (nombre: string, id: number, nombres = [nombre, nombre.toUpperCase(), ` ${nombre} `]) => ({
      item: {
        nombre,
        items: nombres.map((nombreCampo, i) =>
          campo({ idItemVisita: id + i, codigo: `m${id + i}`, nombre: nombreCampo, valor: i }),
        ),
      },
    });
    const [categoria] = servicio.limpiar([
      {
        idCategoriaItem: 900,
        nombre: 'Materiales',
        descripcion: 'Materiales',
        posicion: 1,
        arrayItems: [
          grupo('Cemento', 1),
          grupo('Arena fina', 10, ['Arena fina', 'ARENA FINA', 'Arena  fina']),
          grupo('Grava', 20, ['Grava', 'Grava', 'Peso']),
          grupo('Acero', 30, ['Acero', '', 'ACERO']),
          grupo('Ladrillo', 40, ['Ladrillo', 'Ladrillo']),
        ],
      },
    ]);

    const bloques = categoria.bloques ?? [];
    expect(bloques.map((bloque) => (bloque.tabla ? 'tabla' : 'campos'))).toEqual([
      'tabla',
      'campos',
      'tabla',
      'tabla',
    ]);
    expect(bloques[0].tabla?.encabezados).toEqual(['Ítem', '', '', '']);
    expect(bloques[0].tabla?.filas.map((fila) => fila.titulo)).toEqual(['Cemento', 'Arena fina']);
    expect(bloques[0].tabla?.filas[1].celdas.map((celda) => celda?.codigo)).toEqual(['m10', 'm11', 'm12']);
    expect(bloques[1].campos.map((item) => item.codigo)).toEqual(['m20', 'm21', 'm22']);
    expect(bloques[2].tabla?.filas.map((fila) => fila.titulo)).toEqual(['Acero']);
    expect(bloques[3].tabla?.encabezados).toEqual(['Ítem', '', '']);
    expect(bloques[3].tabla?.filas.map((fila) => fila.titulo)).toEqual(['Ladrillo']);
    const pintados = bloques.flatMap((bloque) => [
      ...(bloque.tabla?.filas.flatMap((fila) => fila.celdas) ?? []),
      ...bloque.campos,
    ]);
    expect(pintados).toEqual(categoria.campos);
    expect(new Set(pintados).size).toBe(14);
  });

  it('toma los encabezados de la etiqueta propia de cada columna cuando es igual en todas las filas', () => {
    const grupo = (nombre: string, id: number, etiquetas: (string | null)[]) => ({
      item: {
        nombre,
        items: etiquetas.map((label, i) =>
          campo({ idItemVisita: id + i, codigo: `e${id + i}`, nombre, parametros: label ? { label } : null }),
        ),
      },
    });
    const [consistente, inconsistente] = servicio.limpiar(
      [
        {
          idCategoriaItem: 901,
          nombre: 'Redes',
          descripcion: 'Redes',
          posicion: 1,
          arrayItems: [grupo('Acueducto', 1, ['Exigido', 'Verificado']), grupo('Gas', 10, ['EXIGIDO', 'verificado'])],
        },
        {
          idCategoriaItem: 902,
          nombre: 'Redes mezcladas',
          descripcion: 'Redes mezcladas',
          posicion: 2,
          arrayItems: [grupo('Acueducto', 20, ['Exigido', 'Verificado']), grupo('Gas', 30, ['Otro', null])],
        },
      ],
      { encabezadosPorCategoria: { 901: ['No', 'se', 'usa'], 902: ['Ítem', 'Uno', 'Dos'] } },
    );

    expect(consistente.tabla?.encabezados).toEqual(['Ítem', 'Exigido', 'Verificado']);
    expect(inconsistente.tabla?.encabezados).toEqual(['Ítem', 'Uno', 'Dos']);
  });

  it('conserva registros con el mismo código y valores distintos', () => {
    const categorias = servicio.limpiar([
      {
        idCategoriaItem: 15,
        nombre: 'Mediciones',
        descripcion: 'Mediciones',
        posicion: 1,
        arrayDescripcion: ['Mediciones'],
        arrayItems: [
          {
            item: {
              nombre: 'Ancho',
              items: [
                campo({ idItemVisita: 20, codigo: 'ancho', nombre: 'Ancho', valor: 1 }),
                campo({ idItemVisita: 21, codigo: 'ancho', nombre: 'Ancho', valor: 2 }),
              ],
            },
          },
        ],
      },
    ]);

    expect(categorias[0].tabla?.filas[0].celdas).toEqual(categorias[0].campos);
    expect(categorias[0].campos.map((item) => [item.id, item.codigo, item.valor])).toEqual([
      [20, 'ancho', 1],
      [21, 'ancho', 2],
    ]);
    expect(categorias[0].campos[0]).not.toBe(categorias[0].campos[1]);
    expect(servicio.indexarPorCodigo(categorias)['ancho']).toBe(categorias[0].campos[1]);
  });

  it('no convierte un campo suelto en tabla', () => {
    const categorias = servicio.limpiar([
      {
        idCategoriaItem: 1,
        nombre: 'Datos',
        descripcion: null,
        posicion: 1,
        arrayItems: [
          {
            item: {
              nombre: 'Dirección',
              items: [
                campo({
                  idItemVisita: 7,
                  codigo: 'v6_direccion',
                  nombre: 'Dirección',
                  valor: 'Calle 1',
                }),
              ],
            },
          },
        ],
      },
    ]);

    expect(categorias[0].tabla).toBeNull();
    expect(categorias[0].campos).toHaveLength(1);
    expect(categorias[0].campos[0].valor).toBe('Calle 1');
  });

  it('conserva un campo imagen y su referencia sin convertirlo en texto editable', () => {
    const categorias = servicio.limpiar([
      {
        idCategoriaItem: 4,
        nombre: 'Registro fotográfico',
        descripcion: null,
        posicion: 1,
        arrayItems: [
          {
            item: {
              nombre: 'Foto fachada',
              items: [
                campo({
                  idItemVisita: 40,
                  codigo: 'v13_imagen_fachada',
                  nombre: 'Foto fachada',
                  tipoItem: 'imagen',
                  valor: 'fachada-guardada.png',
                }),
              ],
            },
          },
          {
            item: {
              nombre: 'Descripción fachada',
              items: [
                campo({
                  idItemVisita: 41,
                  codigo: 'v13_descripcion_fachada',
                  nombre: 'Descripción fachada',
                  tipoItem: 'texto',
                  valor: 'Fachada principal',
                }),
              ],
            },
          },
        ],
      },
    ]);

    expect(categorias[0].campos.map((item) => [item.codigo, item.tipo, item.valor])).toEqual([
      ['v13_imagen_fachada', 'imagen', 'fachada-guardada.png'],
      ['v13_descripcion_fachada', 'texto', 'Fachada principal'],
    ]);
  });

  it('arma el envío de la imagen con la clave del archivo y sin reemplazar la referencia', () => {
    const archivo = new File(['img'], 'localizacion.png', { type: 'image/png' });
    const campo: VisitaCampo = {
      id: 2,
      codigo: 'v13_imagen_localizacion',
      nombre: 'Imagen localización',
      tipo: 'imagen',
      label: null,
      dominio: null,
      opciones: null,
      descripcion: null,
      soloLectura: false,
      valor: 'localizacion-guardada.png',
    };
    const cuerpo = cuerpoImagenVisita(15, campo, archivo);

    expect(cuerpo.get('data[0][codigo]')).toBe('v13_imagen_localizacion');
    expect(cuerpo.get('data[0][tipoItem]')).toBe('imagen');
    expect(cuerpo.get('data[0][valor]')).toBe('localizacion-guardada.png');
    const enviado = cuerpo.get('files[v13_imagen_localizacion][file]');
    expect(enviado).toBeInstanceOf(File);
    expect((enviado as File).name).toBe('localizacion.png');
    expect(campo.valor).toBe('localizacion-guardada.png');
  });

  it('serializa vacío, cero, falso y nulo sin mezclarlos', () => {
    expect(serializarValorVisita(null)).toBe('null');
    expect(serializarValorVisita(undefined)).toBe('null');
    expect(serializarValorVisita('')).toBe('');
    expect(serializarValorVisita(0)).toBe('0');
    expect(serializarValorVisita(false)).toBe('false');
    expect(serializarValorVisita('1.50')).toBe('1.50');
  });

  it('mantiene separados dos formularios que comparten nombres y códigos', () => {
    const opciones = ['Si', 'No'];
    const visita = formularioConDireccion({
      idCategoriaItem: 1,
      codigo: 'direccion',
      valor: 'Calle A',
      opciones,
    });
    const otro: VisitaFormularioCategoriaRaw[] = [
      {
        idCategoriaItem: 9,
        nombre: 'Chequeo',
        descripcion: null,
        posicion: 3,
        arrayDescripcion: ['Ítem', 'Dirección', 'Nota'],
        arrayItems: [
          {
            item: {
              nombre: 'Dirección',
              items: [
                campo({
                  idItemVisita: 9,
                  codigo: 'direccion',
                  nombre: 'Dirección',
                  valor: false,
                  parametros: { opciones, label: 'Valor medido' },
                }),
                campo({
                  idItemVisita: 10,
                  codigo: 'nota',
                  nombre: 'Dirección',
                  tipoItem: 'numero',
                  valor: 0,
                }),
              ],
            },
          },
        ],
      },
    ];
    const entradaVisita = structuredClone(visita);
    const entradaOtro = structuredClone(otro);

    const [resultadoVisita, resultadoOtro] = [visita, otro].map((formulario) => servicio.limpiar(formulario));
    const repetido = servicio.limpiar(visita);

    resultadoVisita[0].campos[0].valor = 'cambiado';
    resultadoVisita[0].campos[0].opciones?.push('N/A');
    servicio.indexarPorCodigo(resultadoVisita)['direccion'].nombre = 'Otro nombre';

    expect(visita).toEqual(entradaVisita);
    expect(otro).toEqual(entradaOtro);
    expect(resultadoOtro[0].campos[0].valor).toBe(false);
    expect(resultadoOtro[0].campos[0].nombre).toBe('Dirección');
    expect(resultadoOtro[0].campos[0].opciones).toEqual(['Si', 'No']);
    expect(resultadoOtro[0].campos[1].valor).toBe(0);
    expect(resultadoOtro[0].tabla?.encabezados).toEqual(['Ítem', 'Dirección', 'Nota']);
    expect(resultadoOtro[0].tabla?.tituloIndependiente).toBe(true);
    expect(resultadoOtro[0].tabla?.filas[0].celdas.map((celda) => celda?.codigo)).toEqual(['direccion', 'nota']);
    expect(resultadoOtro[0].tabla?.filas[0].celdas[0]).toBe(resultadoOtro[0].campos[0]);
    expect(resultadoVisita[0].campos[0]).not.toBe(resultadoOtro[0].campos[0]);
    expect(resultadoVisita[0].campos[0].opciones).not.toBe(opciones);
    expect(resultadoVisita[0].tabla).toBeNull();
    expect(repetido[0].campos.map((item) => [item.codigo, item.valor, item.nombre])).toEqual([
      ['direccion', 'Calle A', 'Dirección'],
      ['foto', 'fachada-a.png', 'Dirección'],
    ]);
    expect(repetido[0].campos[0]).not.toBe(resultadoVisita[0].campos[0]);
    expect(resultadoOtro[0].campos.map((item) => item.valor)).toEqual([false, 0]);
  });

  it('no arrastra la configuración de un formulario al siguiente', () => {
    const corto = formularioConDireccion({
      idCategoriaItem: 4,
      codigo: 'nota',
      valor: '',
      tipoItem: 'texto-min',
    });
    const conClase = servicio.limpiar(corto, {
      clasePorTipo: (tipo, soloLectura) => (tipo === 'texto-min' && !soloLectura ? 'col-md-6' : null),
    });
    const sinClase = servicio.limpiar(corto);

    expect(conClase[0].campos[0].clase).toBe('col-md-6');
    expect(sinClase[0].campos[0].clase).toBeNull();
    expect(conClase[0].campos[1].clase).toBeNull();
  });
});

function formularioConDireccion(datos: {
  idCategoriaItem: number;
  codigo: string;
  valor: string | number | boolean | null;
  opciones?: string[];
  tipoItem?: string;
}): VisitaFormularioCategoriaRaw[] {
  return [
    {
      idCategoriaItem: datos.idCategoriaItem,
      nombre: 'Datos',
      descripcion: null,
      posicion: 1,
      arrayItems: [
        {
          item: {
            nombre: 'Dirección',
            items: [
              campo({
                idItemVisita: datos.idCategoriaItem,
                codigo: datos.codigo,
                nombre: 'Dirección',
                tipoItem: datos.tipoItem ?? 'texto',
                parametros: datos.opciones ? { opciones: datos.opciones, label: 'Dirección' } : null,
                valor: datos.valor,
              }),
            ],
          },
        },
        {
          item: {
            nombre: 'Dirección',
            items: [
              campo({
                idItemVisita: datos.idCategoriaItem + 100,
                codigo: 'foto',
                nombre: 'Dirección',
                tipoItem: 'imagen',
                valor: datos.idCategoriaItem === 1 ? 'fachada-a.png' : 'fachada-b.png',
              }),
            ],
          },
        },
      ],
    },
  ];
}

describe('VisitaLimpiaService.ubicacion', () => {
  const servicio = new VisitaLimpiaService();
  const visita = (latitud: string | null | undefined, longitud: string | null | undefined): VisitaDetalle => ({
    idVisita: 1,
    latitud,
    longitud,
  });

  it('convierte las coordenadas de texto de SAUL a números', () => {
    expect(servicio.ubicacion(visita('3.4372', '-76.5225'))).toEqual({ latitud: 3.4372, longitud: -76.5225 });
  });

  it('acepta coma decimal y espacios', () => {
    expect(servicio.ubicacion(visita(' 3,4372 ', '-76,5225'))).toEqual({ latitud: 3.4372, longitud: -76.5225 });
  });

  it.each([
    ['sin visita', null],
    ['latitud vacía', visita('', '-76.5225')],
    ['longitud null', visita('3.4372', null)],
    ['sin campos', visita(undefined, undefined)],
    ['texto que no es número', visita('abc', '-76.5225')],
    ['latitud fuera de rango', visita('120', '-76.5225')],
    ['longitud fuera de rango', visita('3.4372', '-200')],
    ['0,0 (valor vacío típico)', visita('0', '0')],
  ])('devuelve null: %s', (_caso, entrada) => {
    expect(servicio.ubicacion(entrada)).toBeNull();
  });
});
