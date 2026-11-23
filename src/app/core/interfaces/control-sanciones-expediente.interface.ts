export interface RespuestaSaul2 {
  success?: boolean;
  msg?: string;
  data?: unknown;
}

export interface PermisosUsuarioSaul2 {
  success: boolean;
  id: number;
  permisos: string[];
}

export interface ComparendoExpedienteBusqueda {
  success: boolean;
  msg?: string;
  data?: ComparendoResumen;
}

export interface ComparendoResumen {
  id: number;
  numeroformato?: string;
  numeroFormato?: string;
  identificacioninfractor?: string;
  expediente?: string;
  fechacomparendo?: FechaLegacy | string;
  porcentajeIncremento?: number;
  nombreInfractor?: string;
}

export interface FechaLegacy {
  timestamp: number;
}

export interface ExpedienteGestion {
  id: number;
  idComparendoXExpedienteAuto?: number;
  numeroDecision?: string;
  numeroFolios?: number;
  fechaDecision?: FechaLegacy;
  fechaEjecutoria?: FechaLegacy;
  estado?: { codigo: string; nombre: string };
  responsable?: { id: number; firstName?: string; lastName?: string };
  comparendo?: ComparendoResumen & { id: number; fechaComparendo?: FechaLegacy };
}

export interface ResponsableExpediente {
  id: number;
  nombre: string;
}

export interface MovimientoExpediente {
  estadoAnterior?: { nombre: string };
  estadoActual?: { nombre: string };
  sfGuardUser?: { firstName?: string; lastName?: string };
  comentario?: string;
  createdAt?: FechaLegacy;
}

export interface PagoComparendoRespuesta {
  dataPago?: { success?: boolean; msg?: string };
  idComparendoXProgramacionPedagogia?: number | null;
}

export interface ExpedienteFisicoRespuesta {
  expedientefisico?: number;
}

export interface ExpedienteListadoItem {
  id: number;
  formato?: string;
  nombre?: string;
  updatedAt?: FechaLegacy;
  isChecked?: boolean;
}

export interface ExpedienteListadoRespuesta {
  success: boolean;
  data: ExpedienteListadoItem[];
}

export interface InspeccionItem {
  id: number;
  nombre: string;
}

export interface DatosMovimientoExpediente {
  asignadoa?: number | null;
  comentario?: string;
  fechaDecision?: string;
  fechaEjecutoria?: string;
  fechaNotificacion?: string;
  fechaNotificacionRecursos?: string;
  recursos?: string;
  incremento?: string | number;
  numeroFolios?: number;
  numeroDecision?: string;
  valorMultaEspecial?: number;
}

export interface RegistrarMovimientoPayload {
  idComparendo?: number | null;
  data: DatosMovimientoExpediente | number[];
  comentario?: string;
  estado: string;
}