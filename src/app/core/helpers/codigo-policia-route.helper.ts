import { ActivatedRoute, Router } from '@angular/router';
import { BusquedaStateService } from '../services/busqueda-state.service';

const RUTA_PRIVADA = ['gestion-acceso-justicia', 'comparendo', 'gestion-ciudadano'] as const;
const SEGMENTOS_RUTA_PUBLICA = ['codigopolicia', 'codigo-policia'] as const;
const RUTA_PUBLICA = ['codigopolicia'] as const;

export interface RutasCodigoPoliciaCtx {
  route?: ActivatedRoute | null;
  busquedaState?: BusquedaStateService | null;
}

/** Marca el flujo como entrada pública (/codigopolicia). */
export function marcarAccesoPublicoCodigoPolicia(
  router: Router,
  route: ActivatedRoute,
  busquedaState: BusquedaStateService,
): void {
  if (esRutaPublicaCodigoPolicia(router, route)) {
    busquedaState.accesoPublicoCodigoPolicia = true;
  }
}

/** true si el usuario entró por /codigopolicia (sin login). */
export function esRutaPublicaCodigoPolicia(
  router: Router,
  route?: ActivatedRoute | null,
): boolean {
  if (route) {
    const enArbol = route.snapshot.pathFromRoot.some((snap) =>
      snap.url.some((seg) =>
        (SEGMENTOS_RUTA_PUBLICA as readonly string[]).includes(seg.path),
      ),
    );
    if (enArbol) return true;
  }
  const path = router.url.split('?')[0].split('#')[0];
  return (SEGMENTOS_RUTA_PUBLICA as readonly string[]).some(
    (seg) =>
      path === `/${seg}` ||
      path.startsWith(`/${seg}/`) ||
      path.includes(`/${seg}/`),
  );
}

function esFlujoPublico(
  router: Router,
  ctx?: RutasCodigoPoliciaCtx | null,
): boolean {
  if (ctx?.busquedaState?.accesoPublicoCodigoPolicia) return true;
  return esRutaPublicaCodigoPolicia(router, ctx?.route ?? null);
}

/** Segmentos de navegación según entrada pública o gestión con sesión. */
export function rutasCodigoPolicia(
  router: Router,
  sufijo?: string | string[],
  ctx?: RutasCodigoPoliciaCtx | null,
): string[] {
  const parts = sufijo == null ? [] : Array.isArray(sufijo) ? sufijo : [sufijo];
  const base = esFlujoPublico(router, ctx) ? [...RUTA_PUBLICA] : [...RUTA_PRIVADA];
  return parts.length ? [...base, ...parts] : [...base];
}
