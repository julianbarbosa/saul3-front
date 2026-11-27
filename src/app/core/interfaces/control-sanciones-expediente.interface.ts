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

export interface MedidaCorrectivaComparendoResumen {
  id?: number;
  nombre?: string;
  esEconomica?: boolean;
  cantidadSmdlv?: number | null;
  conmutablePorPedagogia?: boolean;
  actores?: string | null;
}

export interface ComparendoXMedidaCorrectivaResumen {
  id: number;
  idcomparendo: number;
  idmedidacorrectiva: number;
  idhechosmedida?: number | null;
  idatribucion?: number | null;
  idestadornmc?: number | null;
  entidadremitido?: string | null;
  medidaCorrectiva?: MedidaCorrectivaComparendoResumen | null;
}

export interface ComparendoResumen {
  id: number;
  numeroformato?: string;
  numeroFormato?: string;
  identificacioninfractor?: string;
  tipoidentificacioninfractor?: string | null;
  expediente?: string;
  fechacomparendo?: FechaLegacy | string;
  porcentajeIncremento?: number | null;
  nombreInfractor?: string;
  comparendoxmedidacorrectiva?: ComparendoXMedidaCorrectivaResumen[];
  medidasCorrectivas?: ComparendoXMedidaCorrectivaResumen[];
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

export interface UltimaPedagogiaComparendo {
  id: number;
  esConmutacion: boolean;
  fecha: string | null;
  hora: string | null;
  lugar: string | null;
  casaJusticia: string | null;
  salonVirtual: string | null;
  estado: { codigo?: string; nombre?: string | null } | null;
}

export interface PagoComparendoResumen {
  id?: number;
  fechapago?: string | null;
  idcomparendo?: number;
  numerorecibo?: string | null;
  valormulta?: number | null;
  valorinteres?: number | null;
  valorneto?: number | null;
  valordescuento?: number | null;
  valordescuentoalivio?: number | null;
  valordescuentocapital?: number | null;
  numerocuenta?: string | null;
  comentario?: string | null;
  valorincremento?: number | null;
  success?: boolean;
  msg?: string;
}

export interface PagoComparendoRespuesta {
  success?: boolean;
  dataPago?: PagoComparendoResumen | null;
  idComparendoXProgramacionPedagogia?: number | null;
  ultimaPedagogia?: UltimaPedagogiaComparendo | null;
}

export interface ExpedienteFisicoRespuesta {
  expedientefisico?: number;
}

export interface ExpedienteListadoItem {
  id: number;
  /** Número de expediente del comparendo (p. ej. 76-001-6-…); usar al abrir gestión. */
  expediente?: string | null;
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