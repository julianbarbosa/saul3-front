import { afterEach, vi } from 'vitest';

import { IMAGEN_TAMANO_MAXIMO_BYTES, ValidadorImagenService } from './validador-imagen.service';

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00];
const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0x00];

function archivo(bytes: number[], nombre: string, tipo: string): File {
  return new File([new Uint8Array(bytes)], nombre, { type: tipo });
}

describe('ValidadorImagenService', () => {
  let servicio: ValidadorImagenService;

  beforeEach(() => {
    servicio = new ValidadorImagenService();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    ['foto.png', PNG, 'image/png'],
    ['foto.jpg', JPEG, 'image/jpeg'],
    ['FOTO.JPEG', JPEG, 'image/jpeg'],
    // Algunos navegadores móviles no informan el tipo de la foto de la cámara.
    ['camara.jpg', JPEG, ''],
  ])('acepta %s', async (nombre, bytes, tipo) => {
    expect(await servicio.validar(archivo(bytes, nombre, tipo))).toBeNull();
  });

  it.each([
    ['animada.gif', 'image/gif'],
    ['documento.pdf', 'application/pdf'],
    ['sin-extension', 'image/png'],
    ['foto.png.exe', 'application/octet-stream'],
    ['.png', 'image/png'],
  ])('rechaza la extensión de %s', async (nombre, tipo) => {
    expect(await servicio.validar(archivo(PNG, nombre, tipo))).toContain('PNG, JPEG o JPG');
  });

  it('rechaza un tipo MIME que no es imagen aunque la extensión sí lo sea', async () => {
    expect(await servicio.validar(archivo(PNG, 'foto.png', 'text/html'))).toContain(
      'PNG, JPEG o JPG',
    );
  });

  it('rechaza un archivo vacío', async () => {
    expect(await servicio.validar(archivo([], 'foto.png', 'image/png'))).toBe(
      'El archivo está vacío.',
    );
  });

  it('rechaza una imagen que supera el tamaño máximo', async () => {
    const grande = archivo(PNG, 'foto.png', 'image/png');
    Object.defineProperty(grande, 'size', { value: IMAGEN_TAMANO_MAXIMO_BYTES + 1 });

    expect(await servicio.validar(grande)).toContain('tamaño máximo');
  });

  it('rechaza un archivo renombrado a .png que no es imagen', async () => {
    const texto = new File(['<script>alert(1)</script>'], 'foto.png', { type: 'image/png' });

    expect(await servicio.validar(texto)).toContain('no es una imagen válida');
  });

  it('rechaza un JPEG renombrado a .png', async () => {
    expect(await servicio.validar(archivo(JPEG, 'foto.png', 'image/png'))).toContain(
      'no es una imagen válida',
    );
  });

  it('rechaza una imagen con firma correcta que el navegador no puede decodificar', async () => {
    vi.stubGlobal('createImageBitmap', () => Promise.reject(new Error('InvalidStateError')));

    expect(await servicio.validar(archivo(PNG, 'foto.png', 'image/png'))).toBe(
      'La imagen está dañada o no se puede leer.',
    );
  });

  it('acepta y libera la imagen cuando el navegador la decodifica', async () => {
    const close = vi.fn();
    vi.stubGlobal('createImageBitmap', () => Promise.resolve({ width: 640, height: 480, close }));

    expect(await servicio.validar(archivo(JPEG, 'foto.jpg', 'image/jpeg'))).toBeNull();
    expect(close).toHaveBeenCalled();
  });
});
