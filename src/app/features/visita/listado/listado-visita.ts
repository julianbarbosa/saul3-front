import { OpcionFiltro } from '../../../shared/components/table/table';
import {
  FechaSaulRaw,
  VisitaListadoFila,
  VisitaListadoRespuesta,
} from '../../../core/interfaces/visita.interface';

/**
 * Apoyo común para las pantallas de listado de visitas.
 * Cada pantalla arma sus propias columnas; aquí solo hay formato y opciones.
 */

/** Tipos de solicitud del filtro en «Visitas Pendientes» (SAUL: listarVisita). */
export const TIPOS_SOLICITUD_PENDIENTES: OpcionFiltro[] = [
  { label: 'Control Preventivo', value: 'Control Preventivo' },
  { label: 'Visita Control LIOEP', value: 'Visita Control LIOEP' },
  { label: 'Visita Control Ornato', value: 'Visita Control Ornato' },
  { label: 'Control Posterior', value: 'Control Posterior' },
];

/**
 * Tipos de solicitud en «Todas» y «Emitidas» (SAUL: listarVisitaTodo).
 * En SAUL esta lista no es igual a la de pendientes (LIOEP vs. Telecomunicaciones); se deja igual que allá.
 */
export const TIPOS_SOLICITUD_TODAS: OpcionFiltro[] = [
  { label: 'Control Preventivo', value: 'Control Preventivo' },
  {
    label: 'Visita Infraestructura Telecomunicaciones',
    value: 'Visita Infraestructura Telecomunicaciones',
  },
  { label: 'Visita Control Ornato', value: 'Visita Control Ornato' },
  { label: 'Control Posterior', value: 'Control Posterior' },
];

/** Enlace al documento del radicado en Orfeo, igual que en SAUL. */
export function urlRadicado(
  radicado: string | null | undefined,
  documento: string | null | undefined,
): string | null {
  const id = (radicado ?? '').toString().trim();
  if (!id) {
    return null;
  }
  const doc = (documento ?? '').toString().trim();
  return `http://www.cali.gov.co/aplicaciones/orweb/orweb/principalDoc.php?id=${encodeURIComponent(id)}&doc=${encodeURIComponent(doc)}`;
}

/** Tamaños de página. 1000 equivale al «Ver todo» de SAUL (el backend no cuenta más de 1000). */
export const TAMANOS_PAGINA_VISITAS = [10, 20, 50, 100, 1000];

/** Columnas por las que el backend sabe ordenar (VisitaRepository::consultarNoCerrado). */
export const ORDEN_POR_DEFECTO = { campo: 'idsolicitud', direccion: 'ASC' as const };

/**
 * SAUL serializa las fechas como `{ timestamp }` (segundos) o, a veces, como texto.
 * Formato igual al de SAUL: `yyyy-MM-dd HH:mm:ss`, en la hora local del navegador.
 */
export function formatearFechaSaul(valor: FechaSaulRaw | string | null | undefined): string {
  if (valor == null || valor === '') {
    return '';
  }
  // Una fecha sin hora (`2026-05-26`) se interpreta en UTC y en Colombia queda en el día anterior.
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return `${valor} 00:00:00`;
  }
  let fecha: Date;
  if (typeof valor === 'object' && typeof valor.timestamp === 'number') {
    fecha = new Date(valor.timestamp * 1000);
  } else if (typeof valor === 'string') {
    fecha = new Date(valor.replace(' ', 'T'));
  } else {
    return '';
  }
  if (Number.isNaN(fecha.getTime())) {
    return typeof valor === 'string' ? valor : '';
  }
  const dos = (n: number) => String(n).padStart(2, '0');
  return (
    `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())} ` +
    `${dos(fecha.getHours())}:${dos(fecha.getMinutes())}:${dos(fecha.getSeconds())}`
  );
}

/**
 * Marca de la fila según días desde la asignación, como en SAUL (rojo > 20 días, amarillo > 15).
 * La tabla la pinta como un borde a la izquierda (ver `table.css`).
 */
export function claseFilaVisita(fila: VisitaListadoFila): string | null {
  const aviso = String(fila?.rowWarning ?? '');
  if (aviso === '1') {
    return 'fila-alerta-alta';
  }
  if (aviso === '2') {
    return 'fila-alerta-media';
  }
  return null;
}

/** Opciones del filtro «Visitador» a partir de la respuesta del backend. */
export function opcionesVisitadores(respuesta: VisitaListadoRespuesta): OpcionFiltro[] {
  return opcionesUnicas((respuesta.visitadores ?? []).map((v) => v.visitador));
}

/** Opciones del filtro «Estado» a partir de la respuesta del backend. */
export function opcionesEstados(respuesta: VisitaListadoRespuesta): OpcionFiltro[] {
  return opcionesUnicas((respuesta.estados ?? []).map((e) => e.codigoEstado));
}

/** Fila lista para pintar: se agregan las fechas ya formateadas para la tabla. */
export type VisitaFilaVista = VisitaListadoFila & {
  fechaVisitaTexto: string;
  fechaRevisionTexto: string;
  fechaActualizacionTexto: string;
};

export function aFilaVista(fila: VisitaListadoFila): VisitaFilaVista {
  return {
    ...fila,
    fechaVisitaTexto: formatearFechaSaul(fila.fechaVisita ?? fila.fechavisita),
    fechaRevisionTexto: formatearFechaSaul(fila.fechaRevision ?? fila.fecharevision),
    fechaActualizacionTexto: formatearFechaSaul(fila.fecha_programacion),
  };
}

function opcionesUnicas(valores: (string | null | undefined)[]): OpcionFiltro[] {
  const limpios = valores.map((v) => (v ?? '').trim()).filter((v) => v !== '');
  return [...new Set(limpios)].sort().map((v) => ({ label: v, value: v }));
}
