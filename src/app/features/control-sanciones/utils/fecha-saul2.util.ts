import { FechaLegacy } from '../../../core/interfaces/control-sanciones-expediente.interface';

export function fechaDesdeLegacy(val: FechaLegacy | string | undefined | null): Date | null {
  if (!val) {
    return null;
  }
  if (typeof val === 'object' && 'timestamp' in val) {
    return new Date(val.timestamp * 1000);
  }
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function fechaInputDesdeLegacy(val: FechaLegacy | string | undefined | null): string {
  const d = fechaDesdeLegacy(val);
  if (!d) {
    return '';
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function esRespuestaExitosaSaul2(r: { success?: boolean }): boolean {
  return r.success === true;
}

/** Mapa rápido para `*tienePermiso('codigo')` en plantillas. */
export function mapaPermisos(permisos: string[] | undefined | null): Record<string, boolean> {
  return Object.fromEntries((permisos ?? []).map((p) => [p, true]));
}