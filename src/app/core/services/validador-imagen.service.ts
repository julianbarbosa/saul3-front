import { Injectable } from '@angular/core';

/** Tope por imagen. Una foto de cámara de celular ronda los 2–8 MB. */
export const IMAGEN_TAMANO_MAXIMO_BYTES = 10 * 1024 * 1024;

/** Lo que acepta el `<input type="file">`: el navegador filtra, pero no se confía en él. */
export const IMAGEN_ACCEPT = '.png,.jpeg,.jpg,image/png,image/jpeg';

type FormatoImagen = 'png' | 'jpeg';

const FORMATO_POR_EXTENSION: Readonly<Record<string, FormatoImagen>> = {
  png: 'png',
  jpg: 'jpeg',
  jpeg: 'jpeg',
};

const MIME_PERMITIDOS: ReadonlySet<string> = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/pjpeg',
]);

/** Firmas binarias (magic numbers): lo que de verdad dice qué es el archivo. */
const FIRMAS: Readonly<Record<FormatoImagen, readonly number[]>> = {
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  jpeg: [0xff, 0xd8, 0xff],
};

const MENSAJE_EXTENSION = 'Solo se permiten archivos con extensión PNG, JPEG o JPG.';

/**
 * Valida en el navegador una imagen antes de subirla (galería o cámara).
 * Revisa extensión, tipo MIME, tamaño, firma binaria y que el navegador la pueda decodificar.
 * Es una primera barrera para el usuario: el backend debe repetir la validación.
 */
@Injectable({ providedIn: 'root' })
export class ValidadorImagenService {
  /** `null` si la imagen es válida; si no, el mensaje para el usuario. */
  async validar(archivo: File): Promise<string | null> {
    const formato = this.formatoPorExtension(archivo.name);
    if (formato === null) {
      return MENSAJE_EXTENSION;
    }
    // Algunos navegadores móviles no informan el tipo: vacío se tolera, la firma decide.
    if (archivo.type !== '' && !MIME_PERMITIDOS.has(archivo.type.toLowerCase())) {
      return MENSAJE_EXTENSION;
    }
    if (archivo.size === 0) {
      return 'El archivo está vacío.';
    }
    if (archivo.size > IMAGEN_TAMANO_MAXIMO_BYTES) {
      return `La imagen supera el tamaño máximo de ${IMAGEN_TAMANO_MAXIMO_BYTES / (1024 * 1024)} MB.`;
    }

    let cabecera: Uint8Array;
    try {
      cabecera = new Uint8Array(await archivo.slice(0, FIRMAS.png.length).arrayBuffer());
    } catch {
      return 'No se pudo leer el archivo.';
    }
    if (!this.tieneFirma(cabecera, FIRMAS[formato])) {
      return 'El archivo no es una imagen válida o no corresponde a su extensión.';
    }

    if (!(await this.sePuedeDecodificar(archivo))) {
      return 'La imagen está dañada o no se puede leer.';
    }
    return null;
  }

  private formatoPorExtension(nombre: string): FormatoImagen | null {
    const punto = nombre.lastIndexOf('.');
    if (punto <= 0 || punto === nombre.length - 1) {
      return null;
    }
    return FORMATO_POR_EXTENSION[nombre.slice(punto + 1).toLowerCase()] ?? null;
  }

  private tieneFirma(cabecera: Uint8Array, firma: readonly number[]): boolean {
    return cabecera.length >= firma.length && firma.every((byte, i) => cabecera[i] === byte);
  }

  /** Decodifica la imagen de verdad: detecta archivos truncados o corruptos con firma correcta. */
  private async sePuedeDecodificar(archivo: File): Promise<boolean> {
    if (typeof createImageBitmap !== 'function') {
      // Sin decodificador (entorno de pruebas): ya pasó la firma; el backend valida el resto.
      return true;
    }
    try {
      const imagen = await createImageBitmap(archivo);
      const valida = imagen.width > 0 && imagen.height > 0;
      imagen.close();
      return valida;
    } catch {
      return false;
    }
  }
}
