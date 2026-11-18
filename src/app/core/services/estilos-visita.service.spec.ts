import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import {
  CLASE_VISITAS,
  COLORES_SSJ,
  EstilosVisitaService,
  TITULOS_SSJ,
  TONOS_ESTADO,
  tonoEstadoVisita,
} from './estilos-visita.service';

/** Contraste WCAG entre dos colores hexadecimales. */
function contraste(a: string, b: string): number {
  const luminancia = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

describe('EstilosVisitaService', () => {
  let servicio: EstilosVisitaService;

  beforeEach(() => {
    document.getElementById('ssj-estilos-visita')?.remove();
    document.body.classList.remove(CLASE_VISITAS);
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    servicio = TestBed.inject(EstilosVisitaService);
  });

  it('usa los colores de la guía', () => {
    expect(COLORES_SSJ.azul).toBe('#0943B5');
    expect(COLORES_SSJ.azulClaro).toBe('#B5C7E9');
    expect(COLORES_SSJ.naranja).toBe('#F3561F');
    expect(COLORES_SSJ.amarillo).toBe('#FECC2F');
    expect(COLORES_SSJ.verde).toBe('#068460');
    expect(COLORES_SSJ.rojo).toBe('#A80521');
    expect(COLORES_SSJ.grisBorde).toBe('#737373');
  });

  it('títulos según la guía: h1 32px azul, h2 24px y h3 1.17em en negro (KIT UI SAUL3)', () => {
    expect(TITULOS_SSJ[1]).toMatchObject({ etiqueta: 'h1', tamano: '2rem', color: 'azul' });
    expect(TITULOS_SSJ[2]).toMatchObject({ etiqueta: 'h2', tamano: '1.5rem', color: 'negro' });
    expect(TITULOS_SSJ[3]).toMatchObject({ etiqueta: 'h3', tamano: '1.17rem', color: 'negro' });
  });

  it('claseTitulo y etiquetaTitulo siguen el patrón', () => {
    expect(servicio.claseTitulo(2)).toBe('ssj-titulo ssj-titulo--2');
    expect(servicio.etiquetaTitulo(3)).toBe('h3');
  });

  it('variable() arma el nombre CSS en kebab-case', () => {
    expect(servicio.variable('azulClaro')).toBe('var(--ssj-azul-claro)');
    expect(servicio.color('rojo')).toBe('#A80521');
  });

  it('la hoja limita los estilos al contenido de Visitas', () => {
    const css = servicio.hojaDeEstilos();
    expect(css).toContain(`body.${CLASE_VISITAS} .contenido-principal h1`);
    expect(css).toContain('font-size: 2rem');
    expect(css).toContain('--ssj-azul: #0943B5;');
    expect(css).toContain("font-family: 'Nunito Sans'");
    expect(css).toContain('NunitoSans-Regular.ttf');
    // Ninguna regla suelta que afecte a toda la aplicación.
    const reglas = css.split('\n').filter((linea) => !linea.startsWith('@font-face'));
    reglas.forEach((regla) => expect(regla.startsWith(`body.${CLASE_VISITAS}`)).toBe(true));
  });

  it('Visitas no tiene desplazamiento horizontal: clip en el body y en el contenido', () => {
    const css = servicio.hojaDeEstilos();
    expect(css).toContain(`body.${CLASE_VISITAS} { overflow-x: clip; }`);
    expect(css).toContain(
      '.contenido-principal { min-width: 0; max-width: 100%; overflow-x: clip;',
    );
  });

  it('elementosDesbordados no reporta nada fuera de Visitas', () => {
    document.body.innerHTML =
      '<div class="contenido-principal"><div style="width:5000px"></div></div>';
    expect(servicio.elementosDesbordados()).toEqual([]);
    document.body.innerHTML = '';
  });

  it('inserta la hoja una sola vez', () => {
    servicio.iniciar();
    servicio.iniciar();
    expect(document.querySelectorAll('#ssj-estilos-visita').length).toBe(1);
  });

  it.each([
    ['Pendiente por visita', 'aviso'],
    ['PENDIENTE POR VISITA', 'aviso'],
    ['Visitada', 'exito'],
    ['Emitido', 'exito'],
    ['Pendiente', 'info'],
    ['Pendiente firma', 'info'],
    ['Pendiente revisión', 'info'],
    ['Vencida', 'peligro'],
    ['Anulada', 'peligro'],
    ['Otro estado', 'neutro'],
    [null, 'neutro'],
  ])('el estado «%s» usa el tono %s (VIS_TABL)', (estado, tono) => {
    expect(tonoEstadoVisita(estado)).toBe(tono);
  });

  it('todas las etiquetas de estado cumplen contraste AA (4.5:1)', () => {
    for (const { fondo, texto } of Object.values(TONOS_ESTADO)) {
      expect(contraste(texto, fondo)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('claseEstado y claseBoton arman las clases de la guía', () => {
    expect(servicio.claseEstado('Vencida')).toBe('ssj-estado ssj-estado--peligro');
    expect(servicio.claseBoton()).toBe('ssj-boton');
    expect(servicio.claseBoton({ variante: 'peligro', relleno: true, pequeno: true })).toBe(
      'ssj-boton ssj-boton--peligro ssj-boton--relleno ssj-boton--pequeno',
    );
  });

  it('activa la clase solo en rutas /visita', () => {
    servicio.sincronizar('/visita/listar-visita');
    expect(document.body.classList.contains(CLASE_VISITAS)).toBe(true);

    servicio.sincronizar('/visita/gestionar/7279?x=1');
    expect(document.body.classList.contains(CLASE_VISITAS)).toBe(true);

    servicio.sincronizar('/gestion-acceso-justicia/comparendo/descargar');
    expect(document.body.classList.contains(CLASE_VISITAS)).toBe(false);

    // Una ruta que solo empieza igual no cuenta.
    servicio.sincronizar('/visitantes');
    expect(document.body.classList.contains(CLASE_VISITAS)).toBe(false);
  });

  it('sigue la navegación después de iniciar', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'visita/listar-visita', children: [] },
          { path: 'otra', children: [] },
        ]),
      ],
    });
    const estilos = TestBed.inject(EstilosVisitaService);
    const router = TestBed.inject(Router);
    estilos.iniciar();

    await router.navigateByUrl('/visita/listar-visita');
    expect(document.body.classList.contains(CLASE_VISITAS)).toBe(true);

    await router.navigateByUrl('/otra');
    expect(document.body.classList.contains(CLASE_VISITAS)).toBe(false);
  });
});
