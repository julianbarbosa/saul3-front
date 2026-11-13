import { Injectable } from '@angular/core';
import { esMarcaRequerido } from '../constants/visita-campos-obligatorios';
import {
  BloquePresentacion,
  ItemVisitaCampoRaw,
  UbicacionVisita,
  VisitaCampo,
  VisitaCategoria,
  VisitaDetalle,
  VisitaFilaTabla,
  VisitaFormularioCategoriaRaw,
  VisitaTabla,
} from '../interfaces/visita.interface';

type FormularioVisitaEntrada = VisitaFormularioCategoriaRaw[] | VisitaCategoria[];
type ValorCampo = string | number | boolean | null;

interface FilaOrigen {
  nombre: string;
  celdas: VisitaCampo[];
}

interface FilaReconocida {
  /** Filas consecutivas con la misma clave van en la misma tabla. */
  clave: string;
  /** Vacío cuando los encabezados se deciden al cerrar la tabla. */
  encabezados: string[];
  tituloIndependiente: boolean;
  fila: VisitaFilaTabla;
}

/**
 * Presentación que aporta cada formulario. El servicio no guarda esta
 * configuración: hay que pasarla en cada llamada.
 * `encabezadosPorCategoria` (clave `idCategoriaItem`) solo se usa en tablas
 * armadas por estructura cuando ni la API ni los campos traen encabezados.
 */
export interface ConfiguracionFormulario {
  clasePorTipo?: (tipo: string, soloLectura: boolean) => string | null;
  encabezadosPorCategoria?: Record<number, string[]>;
}

/** Conserva null, '', 0 y false. El contrato POST de SAUL usa la cadena `null` para vaciar. */
export function serializarValorVisita(valor: ValorCampo | undefined): string {
  if (valor === null || valor === undefined) {
    return 'null';
  }
  return String(valor);
}

@Injectable({ providedIn: 'root' })
export class VisitaLimpiaService {
  /**
   * Normaliza un formulario sin conservar el anterior. Dos llamadas, aunque
   * usen los mismos nombres de campo, no comparten objetos.
   */
  limpiar(
    categorias: FormularioVisitaEntrada,
    configuracion?: ConfiguracionFormulario,
  ): VisitaCategoria[] {
    if (categorias.length === 0) {
      return [];
    }

    if (this.esFormularioLimpio(categorias)) {
      return [...categorias]
        .sort((a, b) => a.posicion - b.posicion)
        .map((cat) => this.clonarCategoria(cat, configuracion));
    }

    return [...categorias]
      .sort((a, b) => a.posicion - b.posicion)
      .map((cat) => this.limpiarCategoria(cat, configuracion));
  }

  /**
   * Ubicación de la visita a partir de `GET /visita/{id}` (columnas `latitud` y `longitud`, texto en BD).
   * Devuelve null si falta alguna, no es número, está fuera de rango o es 0,0 (valor vacío típico).
   * Acepta coma decimal ("3,4372"). Es la limpieza de los datos generales, como `limpiar()` lo es del formulario.
   */
  ubicacion(visita: VisitaDetalle | null | undefined): UbicacionVisita | null {
    const latitud = this.aCoordenada(visita?.latitud);
    const longitud = this.aCoordenada(visita?.longitud);
    if (latitud === null || longitud === null) {
      return null;
    }
    if (Math.abs(latitud) > 90 || Math.abs(longitud) > 180 || (latitud === 0 && longitud === 0)) {
      return null;
    }
    return { latitud, longitud };
  }

  private aCoordenada(texto: string | null | undefined): number | null {
    const limpio = (texto ?? '').trim().replace(',', '.');
    if (!limpio) {
      return null;
    }
    const numero = Number(limpio);
    return Number.isFinite(numero) ? numero : null;
  }

  /**
   * Índice de la lista recibida, keyed por `codigo`. No queda guardado en el servicio.
   * Si un formulario repite `codigo`, aunque los valores sean distintos, ambos campos
   * siguen en `campos`. Este índice solo puede señalar uno: la última aparición.
   */
  indexarPorCodigo(categorias: VisitaCategoria[]): Record<string, VisitaCampo> {
    return Object.fromEntries(
      categorias.flatMap((c) => c.campos).map((campo) => [campo.codigo, campo]),
    );
  }

  private esFormularioLimpio(categorias: FormularioVisitaEntrada): categorias is VisitaCategoria[] {
    return 'campos' in categorias[0];
  }

  private limpiarCategoria(
    cat: VisitaFormularioCategoriaRaw,
    configuracion?: ConfiguracionFormulario,
  ): VisitaCategoria {
    const filas: FilaOrigen[] = cat.arrayItems.map((entry) => ({
      nombre: entry.item.nombre,
      celdas: entry.item.items.map((it) => this.limpiarCampo(it, configuracion)),
    }));
    const campos = filas.flatMap((fila) => fila.celdas);
    const presentacion = this.presentar(
      this.encabezadosApi(cat.arrayDescripcion, cat.descripcion),
      configuracion?.encabezadosPorCategoria?.[cat.idCategoriaItem],
      filas,
    );

    return {
      id: cat.idCategoriaItem,
      nombre: cat.nombre.trim(),
      posicion: cat.posicion,
      descripcion: cat.descripcion?.trim() || null,
      creadoEn: this.aFecha(cat.createdAt?.timestamp),
      actualizadoEn: this.aFecha(cat.updatedAt?.timestamp),
      campos,
      tabla: presentacion.tabla,
      bloques: presentacion.bloques,
    };
  }

  private clonarCategoria(
    cat: VisitaCategoria,
    configuracion?: ConfiguracionFormulario,
  ): VisitaCategoria {
    const origenACopia = new Map<VisitaCampo, VisitaCampo>();
    const campos = cat.campos.map((campo) => {
      const copia = this.clonarCampo(campo, configuracion);
      origenACopia.set(campo, copia);
      return copia;
    });

    const tabla = this.copiarTabla(cat.tabla, origenACopia, configuracion);
    const bloques = (
      cat.bloques ?? [{ tabla: cat.tabla, campos: this.camposSinTabla(cat.campos, cat.tabla) }]
    ).map((bloque) => ({
      tabla: this.copiarTabla(bloque.tabla, origenACopia, configuracion),
      campos: bloque.campos.map(
        (campo) => this.copiaDeCelda(campo, origenACopia, configuracion) ?? campo,
      ),
    }));

    return {
      ...cat,
      descripcion: cat.descripcion,
      campos,
      tabla,
      bloques,
    };
  }

  /**
   * Arma bloques en el orden de los grupos. Un grupo es fila de tabla cuando su
   * cantidad de campos encaja con los encabezados de la API, o cuando tiene dos o
   * más campos que se llaman como el grupo (o no tienen nombre propio). Las filas
   * consecutivas del mismo tipo y tamaño forman una tabla; las celdas quedan en el
   * orden de la API. Un grupo que no cumple sigue como campos, con su etiqueta.
   * La celda y su campo son el mismo objeto dentro del resultado.
   */
  private presentar(
    encabezados: string[],
    configurados: string[] | undefined,
    filas: FilaOrigen[],
  ): { tabla: VisitaTabla | null; bloques: BloquePresentacion[] } {
    const bloques: BloquePresentacion[] = [];
    let tablaActual: VisitaTabla | null = null;
    let claveActual: string | null = null;
    let sueltos: VisitaCampo[] = [];

    const cerrarSueltos = (): void => {
      if (sueltos.length === 0) {
        return;
      }
      bloques.push({ tabla: null, campos: sueltos });
      sueltos = [];
    };
    const cerrarTabla = (): void => {
      if (!tablaActual) {
        return;
      }
      if (tablaActual.encabezados.length === 0) {
        tablaActual.encabezados = this.encabezadosEstructura(tablaActual.filas, configurados);
      }
      bloques.push({ tabla: tablaActual, campos: [] });
      tablaActual = null;
      claveActual = null;
    };

    for (const fila of filas) {
      const reconocida =
        this.filaSegunEncabezados(fila, encabezados) ?? this.filaSegunEstructura(fila);
      if (!reconocida) {
        cerrarTabla();
        sueltos.push(...fila.celdas);
        continue;
      }
      cerrarSueltos();
      if (tablaActual && claveActual === reconocida.clave) {
        tablaActual.filas.push(reconocida.fila);
        continue;
      }
      cerrarTabla();
      claveActual = reconocida.clave;
      tablaActual = {
        encabezados: reconocida.encabezados,
        tituloIndependiente: reconocida.tituloIndependiente,
        filas: [reconocida.fila],
      };
    }
    cerrarSueltos();
    cerrarTabla();

    const tablas = bloques.flatMap((bloque) => (bloque.tabla ? [bloque.tabla] : []));
    return { tabla: tablas.length === 1 ? tablas[0] : null, bloques };
  }

  /**
   * `arrayDescripcion`; si no trae columnas, `descripcion` separada por comas
   * (lo que hace `getArrayDescripcion` en SAUL).
   * Un texto vacío ocupa su columna, como en SAUL: `,Norma,Aprobados` son tres.
   */
  private encabezadosApi(
    arrayDescripcion: string[] | undefined,
    descripcion: string | null | undefined,
  ): string[] {
    for (const lista of [arrayDescripcion, descripcion?.split(',')]) {
      const textos = (lista ?? []).map((texto) => texto.trim());
      if (textos.length > 1 && textos.some((texto) => texto.length > 0)) {
        return textos;
      }
    }
    return [];
  }

  /**
   * Encabezados de una tabla armada por estructura, en este orden:
   * el texto propio de cada columna (`label` o `descripcion` del campo) si es el mismo
   * en todas las filas; si no, los configurados para la categoría; si no, `Ítem` y
   * columnas sin nombre.
   */
  private encabezadosEstructura(
    filas: VisitaFilaTabla[],
    configurados: string[] | undefined,
  ): string[] {
    const cantidad = filas[0].celdas.length;
    const propios = Array.from({ length: cantidad }, (_, indice) => {
      const textos = filas.map((fila) => {
        const celda = fila.celdas[indice];
        const texto = (celda?.label ?? celda?.descripcion ?? '').trim();
        return this.normalizar(texto) === this.normalizar(fila.titulo) ? '' : texto;
      });
      const primero = textos[0];
      return primero && textos.every((texto) => this.normalizar(texto) === this.normalizar(primero))
        ? primero
        : null;
    });
    if (propios.every((texto) => texto !== null)) {
      return ['Ítem', ...(propios as string[])];
    }
    const configuracion = (configurados ?? []).map((texto) => texto.trim());
    if (configuracion.length === cantidad + 1) {
      return configuracion;
    }
    return ['Ítem', ...Array.from({ length: cantidad }, () => '')];
  }

  private filaSegunEncabezados(fila: FilaOrigen, encabezados: string[]): FilaReconocida | null {
    const modo = this.encajeTabla(fila.celdas.length, encabezados.length);
    if (!modo) {
      return null;
    }
    return {
      clave: `api:${modo}:${encabezados.join('\u0000')}`,
      encabezados: [...encabezados],
      tituloIndependiente: modo === 'titulo',
      fila: { titulo: fila.nombre.trim(), celdas: [...fila.celdas] },
    };
  }

  /** Dos o más campos que se llaman como el grupo, o sin nombre propio. */
  private filaSegunEstructura(fila: FilaOrigen): FilaReconocida | null {
    const titulo = this.normalizar(fila.nombre);
    if (fila.celdas.length < 2 || !titulo) {
      return null;
    }
    const mismoNombre = fila.celdas.every((celda) => {
      const nombre = this.normalizar(celda.nombre);
      return !nombre || nombre === titulo;
    });
    if (!mismoNombre) {
      return null;
    }
    return {
      clave: `estructura:${fila.celdas.length}`,
      encabezados: [],
      tituloIndependiente: true,
      fila: { titulo: fila.nombre.trim(), celdas: [...fila.celdas] },
    };
  }

  /** Sin mayúsculas, tildes ni espacios repetidos. */
  private normalizar(texto: string | null | undefined): string {
    return (texto ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('es')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** `titulo`: sobra un encabezado para el nombre del grupo. `directo`: un encabezado por campo. */
  private encajeTabla(
    cantidadCampos: number,
    cantidadEncabezados: number,
  ): 'titulo' | 'directo' | null {
    if (cantidadCampos <= 1 || cantidadEncabezados <= 1) {
      return null;
    }
    if (cantidadEncabezados === cantidadCampos + 1) {
      return 'titulo';
    }
    if (cantidadEncabezados === cantidadCampos) {
      return 'directo';
    }
    return null;
  }

  private copiarTabla(
    tabla: VisitaTabla | null,
    origenACopia: Map<VisitaCampo, VisitaCampo>,
    configuracion?: ConfiguracionFormulario,
  ): VisitaTabla | null {
    if (!tabla) {
      return null;
    }
    return {
      encabezados: [...tabla.encabezados],
      tituloIndependiente: tabla.tituloIndependiente,
      filas: tabla.filas.map((fila) => ({
        titulo: fila.titulo,
        celdas: fila.celdas.map((celda) => this.copiaDeCelda(celda, origenACopia, configuracion)),
      })),
    };
  }

  private camposSinTabla(campos: VisitaCampo[], tabla: VisitaTabla | null): VisitaCampo[] {
    const enTabla = new Set(tabla?.filas.flatMap((fila) => fila.celdas) ?? []);
    return campos.filter((campo) => !enTabla.has(campo));
  }

  private limpiarCampo(
    it: ItemVisitaCampoRaw,
    configuracion?: ConfiguracionFormulario,
  ): VisitaCampo {
    const opciones = it.parametros?.opciones;
    return {
      id: it.idItemVisita,
      codigo: it.codigo,
      nombre: it.nombre.trim(),
      tipo: it.tipoItem,
      label: it.parametros?.label ?? null,
      dominio: it.parametros?.dominio ?? null,
      opciones: Array.isArray(opciones)
        ? opciones.filter((opcion) => typeof opcion === 'string')
        : null,
      descripcion: it.descripcion?.trim() || null,
      soloLectura: it.soloLectura === 1,
      requerido: esMarcaRequerido(it.parametros?.requerido),
      valor: it.valor ?? null,
      clase: this.resolverClase(it.tipoItem, it.soloLectura === 1, null, configuracion),
    };
  }

  private clonarCampo(campo: VisitaCampo, configuracion?: ConfiguracionFormulario): VisitaCampo {
    return {
      ...campo,
      opciones: campo.opciones ? [...campo.opciones] : null,
      clase: this.resolverClase(campo.tipo, campo.soloLectura, campo.clase, configuracion),
    };
  }

  private copiaDeCelda(
    celda: VisitaCampo | null,
    origenACopia: Map<VisitaCampo, VisitaCampo>,
    configuracion?: ConfiguracionFormulario,
  ): VisitaCampo | null {
    if (!celda) {
      return null;
    }
    return origenACopia.get(celda) ?? this.clonarCampo(celda, configuracion);
  }

  private resolverClase(
    tipo: string,
    soloLectura: boolean,
    claseActual: string | null | undefined,
    configuracion?: ConfiguracionFormulario,
  ): string | null {
    if (configuracion?.clasePorTipo) {
      return configuracion.clasePorTipo(tipo, soloLectura);
    }
    return claseActual ?? null;
  }

  private aFecha(ts?: number): string | null {
    if (ts == null || ts <= 0) {
      return null;
    }
    return new Date(ts * 1000).toISOString();
  }
}
