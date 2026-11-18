import { Injectable, isDevMode } from '@angular/core';

import { CORRECCIONES_TILDES } from '../constants/correcciones-tildes';
import { VisitaCampo, VisitaCategoria, VisitaTabla } from '../interfaces/visita.interface';
import { corregirSiglas, formatearTitulo as tipoTitulo, SIGLAS_TITULO, vieneSinCaja } from '../../shared/utils/formatear-titulo';

/** Texto que llega de SAUL listo para mostrar. Solo toca textos visibles, nunca lo que se envía en el POST. */
@Injectable({ providedIn: 'root' })
export class FormatoTextoService {
  siglas: readonly string[] = SIGLAS_TITULO;

  private readonly avisadas = new Set<string>();

  formatearTitulo(texto: string | null | undefined): string {
    const limpio = (texto ?? '').replace(/\s+/g, ' ').trim();
    if (!limpio) {
      return '';
    }
    const corregido = limpio
      .split(' ')
      .map((palabra) => this.corregirTilde(palabra))
      .join(' ');
    return vieneSinCaja(corregido) ? tipoTitulo(corregido, this.siglas) : corregirSiglas(corregido, this.siglas);
  }

  tieneTilde(texto: string): boolean {
    return /[áéíóúüñ]/i.test(texto);
  }

  /** Formatea en el lugar: las celdas de tabla y `campos` comparten objetos y deben seguir haciéndolo. */
  formatearFormulario(categorias: VisitaCategoria[]): VisitaCategoria[] {
    const campos = new Set<VisitaCampo>();
    const tablas = new Set<VisitaTabla>();
    for (const categoria of categorias) {
      categoria.nombre = this.formatearTitulo(categoria.nombre);
      categoria.campos.forEach((campo) => campos.add(campo));
      for (const tabla of [categoria.tabla, ...(categoria.bloques ?? []).map((bloque) => bloque.tabla)]) {
        if (tabla) {
          tablas.add(tabla);
        }
      }
      for (const bloque of categoria.bloques ?? []) {
        bloque.campos.forEach((campo) => campos.add(campo));
      }
    }
    for (const tabla of tablas) {
      tabla.encabezados = tabla.encabezados.map((encabezado) => this.formatearTitulo(encabezado));
      for (const fila of tabla.filas) {
        fila.titulo = this.formatearTitulo(fila.titulo);
        fila.celdas.forEach((celda) => celda && campos.add(celda));
      }
    }
    for (const campo of campos) {
      campo.nombre = this.formatearTitulo(campo.nombre);
      if (campo.label !== null) {
        campo.label = this.formatearTitulo(campo.label);
      }
    }
    return categorias;
  }

  private corregirTilde(palabra: string): string {
    // Los dígitos pegados al final ("ITEM3") no son parte de la palabra que se corrige.
    const [, antes = '', nucleo = '', digitos = '', despues = ''] =
      palabra.match(/^([^\p{L}\p{N}]*)(.*?)(\p{N}*)([^\p{L}\p{N}]*)$/u) ?? [];
    if (!nucleo) {
      return palabra;
    }
    const clave = nucleo.toLocaleLowerCase('es');
    const correccion = CORRECCIONES_TILDES[clave];
    if (!correccion) {
      this.avisarTildeFaltante(clave);
      return palabra;
    }
    return antes + this.conCajaDe(nucleo, correccion) + digitos + despues;
  }

  private conCajaDe(original: string, correccion: string): string {
    if (original === original.toLocaleUpperCase('es')) {
      return correccion.toLocaleUpperCase('es');
    }
    const inicial = original.charAt(0);
    if (inicial === inicial.toLocaleUpperCase('es')) {
      return correccion.charAt(0).toLocaleUpperCase('es') + correccion.slice(1);
    }
    return correccion;
  }

  private avisarTildeFaltante(palabra: string): void {
    if (!isDevMode() || !/cions?$/.test(palabra) || this.tieneTilde(palabra) || this.avisadas.has(palabra)) {
      return;
    }
    this.avisadas.add(palabra);
    console.warn('[FormatoTexto] Posible tilde faltante:', palabra);
  }
}
