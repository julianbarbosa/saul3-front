/** Usuario de SAUL tal como lo serializa la entidad (visitador, supervisor). */
export interface PersonaSaulRaw {
  firstName?: string | null;
  lastName?: string | null;
}

/** Fecha serializada por SAUL (DateTime de PHP): se usa `timestamp` en segundos. */
export interface FechaSaulRaw {
  timestamp: number;
}

/**
 * Respuesta de `GET /visita/{idVisita}` (saul2: VisitaController::listarAction, entidad Visita.php).
 * Son los datos generales de la visita, no los valores de los campos del formulario
 * (esos llegan en `GET /visita/generar/{idVisita}`).
 * Solo se tipan los campos que usa ssjfront; la entidad trae más.
 */
export interface VisitaDetalle {
  idVisita: number;
  idTipoVisita?: number | null;
  /** 1 = formulario dinámico. */
  esDinamica?: number | null;
  estado?: { nombre?: string | null; codigo?: string | null } | null;
  visitador?: PersonaSaulRaw | null;
  supervisor?: PersonaSaulRaw | null;
  tipoVisita?: { descripcion?: string | null; codigo?: string | null } | null;
  solicitud?: { radicado?: string | null; radicadohijo?: string | null } | null;
  radicadoInspeccion?: string | null;
  /** Coordenadas como texto (columnas `text` en BD). */
  longitud?: string | null;
  latitud?: string | null;
  observaciones?: string | null;
  nombreTitular?: string | null;
  direccionQueja?: string | null;
  fechaProgramacion?: FechaSaulRaw | null;
  fechaVisita?: FechaSaulRaw | null;
}

/** Ubicación de la visita ya validada, en grados decimales (WGS84), lista para el mapa. */
export interface UbicacionVisita {
  latitud: number;
  longitud: number;
}

/** Encabezado «Registro de Visita», igual al de SAUL (registrarVisita.tpl.html). */
export interface VisitaEncabezado {
  consecutivo: number;
  estado: string;
  visitador: string;
  revisor: string;
  tipoVisita: string;
  radicadoSolicitud: string | null;
  radicadoRespuesta: string | null;
  radicadoInspeccion: string | null;
}

/** Respuesta cruda del API SAUL2 (formato legacy). */
export interface ItemVisitaCampoRaw {
  idItemVisita: number;
  nombre: string;
  codigo: string;
  descripcion: string | null;
  tipoItem: string;
  parametros: { dominio?: string; label?: string; opciones?: string[] } | null;
  soloLectura: number;
  valor?: string | number | boolean | null;
}

export interface VisitaFormularioCategoriaRaw {
  idCategoriaItem: number;
  nombre: string;
  descripcion: string | null;
  posicion: number;
  createdAt?: { timestamp: number };
  updatedAt?: { timestamp: number };
  arrayDescripcion?: string[];
  arrayItems: {
    item: {
      nombre: string;
      items: ItemVisitaCampoRaw[];
    };
  }[];
}

/** Formulario normalizado para la UI y el guardado. `codigo` y `valor` no se reescriben. */
export interface VisitaCampo {
  id: number;
  codigo: string;
  nombre: string;
  tipo: string;
  label: string | null;
  dominio: string | null;
  opciones: string[] | null;
  descripcion: string | null;
  soloLectura: boolean;
  valor: string | number | boolean | null;
  /** Clases Bootstrap u otras para el contenedor del campo (ej. col-md-6). */
  clase?: string | null;
}

/** Fila visual. Las celdas apuntan a los mismos objetos de `campos`. */
export interface VisitaFilaTabla {
  titulo: string;
  celdas: (VisitaCampo | null)[];
}

/** Presentación de una categoría con varias columnas. No sustituye a `campos`. */
export interface VisitaTabla {
  encabezados: string[];
  tituloIndependiente: boolean;
  filas: VisitaFilaTabla[];
}

/** Trozo de la categoría en el orden original: una tabla o campos sueltos. */
export interface BloquePresentacion {
  tabla: VisitaTabla | null;
  campos: VisitaCampo[];
}

export interface VisitaCategoria {
  id: number;
  nombre: string;
  posicion: number;
  descripcion: string | null;
  creadoEn: string | null;
  actualizadoEn: string | null;
  campos: VisitaCampo[];
  tabla: VisitaTabla | null;
  /** Orden de tablas y campos sueltos. Si falta, la pantalla deriva un bloque. */
  bloques?: BloquePresentacion[];
}

/**
 * Fila del listado de visitas (`GET /visita` de saul2, VisitaRepository::consultarNoCerrado).
 * Los nombres son los que devuelve el backend; no se renombran.
 */
export interface VisitaListadoFila {
  idvisita: number;
  idsolicitud: number;
  direccion?: string | null;
  radicado?: string | null;
  radicadoInspeccion?: string | null;
  identificacionDocumento?: string | null;
  numIdentificacionRevisor?: string | null;
  nombreTipoSolicitud?: string | null;
  nombreEstado?: string | null;
  codigoEstado?: string | null;
  visitador?: string | null;
  supervisor?: string | null;
  /** Ruta de SAUL para gestionar la visita según su tipo y estado (ej. `/visita/registrar/`). */
  ruta?: string | null;
  fechaVisita?: FechaSaulRaw | string | null;
  fechaRevision?: FechaSaulRaw | string | null;
  fecha_programacion?: FechaSaulRaw | string | null;
  comuna?: number | string | null;
  /** Días desde la asignación: 1 = más de 20 días (rojo), 2 = más de 15 (amarillo), 0 = a tiempo. */
  rowWarning?: number | string | null;
}

/** Respuesta completa de `GET /visita`. `visitadores` y `estados` alimentan los filtros. */
export interface VisitaListadoRespuesta {
  /** Solo viene cuando falla (ej. sin sesión ni token): `{ success: false, msg }`. */
  success?: boolean;
  msg?: string;
  data: VisitaListadoFila[];
  totalItems: number;
  visitadores?: { visitador: string | null }[];
  estados?: { codigoEstado: string | null }[];
}

/** Lo que pide la pantalla: página, tamaño y filtros por columna (campo → valor). */
export interface VisitaListadoConsulta {
  page: number;
  pageSize: number;
  filtros: Record<string, string>;
  orderBy?: string;
  orderDir?: 'ASC' | 'DESC';
}

/** Respuesta `{ success, message | msg }` de las acciones sobre una visita. */
export interface VisitaAccionRespuesta {
  success: boolean;
  message?: string;
  msg?: string;
}
