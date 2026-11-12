
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  PersonaSaulRaw,
  VisitaAccionRespuesta,
  VisitaCampo,
  VisitaCategoria,
  VisitaDetalle,
  VisitaEncabezado,
  VisitaFormularioCategoriaRaw,
  VisitaListadoConsulta,
  VisitaListadoRespuesta,
} from '../interfaces/visita.interface';
import { EstilosVisitaService } from './estilos-visita.service';
import { serializarValorVisita } from './visita-limpia.service';

export interface VisitaGuardadoRespuesta {
  success: boolean;
  msg?: string;
  value?: string;
}

@Injectable({
  providedIn: 'root',
})
export class VisitaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.SAUL2_API_URL;
  private readonly baseUrl3 = environment.SAUL3_API_URL;

  constructor() {
    // Toda pantalla de Visitas usa este servicio: así la guía de estilos siempre queda aplicada.
    inject(EstilosVisitaService).iniciar();
  }

  obtenerFormulario(idVisita: number): Observable<VisitaFormularioCategoriaRaw[] | VisitaCategoria[]> {
    return this.http.get<VisitaFormularioCategoriaRaw[] | VisitaCategoria[]>(
      `${this.baseUrl}/visita/generar/${idVisita}`,
    );
  }

  /**
   * GET `/visita/{idVisita}`: detalle de la visita, la misma consulta que hace SAUL con `Visita.find`.
   * `baseUrl` no termina en "/", por eso la ruta empieza con "/visita".
   */
  findById(idVisita: string | number): Observable<VisitaDetalle> {
    return this.http.get<VisitaDetalle>(`${this.baseUrl}/visita/${idVisita}`);
  }

  urlDocumento(nombre: string): string | null {
    const archivo = nombre.trim();
    if (!archivo || archivo.includes('/') || archivo.includes('\\') || archivo.includes('..')) {
      return null;
    }
    const base = this.baseUrl.replace(/\/app_dev\.php\/?$/, '').replace(/\/app\.php\/?$/, '');
    return `${base}/upload/documentos/${encodeURIComponent(archivo)}`;
  }

  /** POST `/visita` de SAUL: un campo por petición, con su `codigo` y `tipoItem`. 1. */
  guardarCampo(
    idVisita: number,
    campo: VisitaCampo,
    valor: string | number | boolean | null = campo.valor,
  ): Observable<VisitaGuardadoRespuesta> {
    const body = new HttpParams()
      .set('idVisita', String(idVisita))
      .set('data[0][codigo]', campo.codigo)
      .set('data[0][tipoItem]', campo.tipo)
      .set('data[0][valor]', serializarValorVisita(valor));

    return this.http.post<VisitaGuardadoRespuesta>(`${this.baseUrl}/visita`, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  /**
   * Mismo POST `/visita`, en multipart. La clave del archivo es `files[codigo][file]`,
   * que es la que SAUL guarda como imagen. No se fija Content-Type: el navegador pone el boundary.
   */
  guardarImagen(idVisita: number, campo: VisitaCampo, archivo: File): Observable<VisitaGuardadoRespuesta> {
    return this.http.post<VisitaGuardadoRespuesta>(
      `${this.baseUrl}/visita`,
      cuerpoImagenVisita(idVisita, campo, archivo),
    );
  }

  /* ---------- Listados (Control a Construcciones) ---------- */

  /** Visitas Pendientes: las que el usuario tiene por gestionar (SAUL: listarVisita). */
  listarPendientes(consulta: VisitaListadoConsulta): Observable<VisitaListadoRespuesta> {
    return this.listar(consulta, {});
  }

  /** Todas las Visitas (SAUL: listarVisitaTodo). */
  listarTodas(consulta: VisitaListadoConsulta): Observable<VisitaListadoRespuesta> {
    return this.listar(consulta, { type: 'all' });
  }

  /** Visitas Emitidas (SAUL: listarVisitaTodo?emitir). */
  listarEmitidas(consulta: VisitaListadoConsulta): Observable<VisitaListadoRespuesta> {
    return this.listar(consulta, { type: 'all', nombreEstado: 'Emitido' });
  }

  /** Visitas Pendientes desde saul3 (GET /api/visita/tarea). Misma consulta que el listado de saul2. */
  listarTareas(consulta: VisitaListadoConsulta): Observable<VisitaListadoRespuesta> {
    return this.listar(consulta, {}, `${this.baseUrl3}/visita/tarea`);
  }

  /************************************************************************************** */
  /* ---------- Acciones sobre una visita ---------- */

  anularVisita(idVisita: number): Observable<VisitaAccionRespuesta> {
    return this.http.post<VisitaAccionRespuesta>(`${this.baseUrl}/visita/anular-visita/${idVisita}`, {
      confirmar: true,
    });
  }

  anularAsignacion(idVisita: number): Observable<VisitaAccionRespuesta> {
    return this.http.post<VisitaAccionRespuesta>(`${this.baseUrl}/visita/${idVisita}/anular_asignacion`, {
      confirmar: true,
    });
  }

  pasarControlPosterior(idVisita: number): Observable<VisitaAccionRespuesta> {
    return this.http.post<VisitaAccionRespuesta>(
      `${this.baseUrl}/visita/pasar-control-posterior/${idVisita}`,
      { confirmar: true },
    );
  }

  editarRadicado(idVisita: number, radicado: string): Observable<VisitaAccionRespuesta> {
    return this.http.get<VisitaAccionRespuesta>(
      `${this.baseUrl}/visita/editar-numero-radicado/${idVisita}/${encodeURIComponent(radicado.trim())}`,
    );
  }

  /**
   * GET del listado. saul2 y saul3 esperan cada parámetro como JSON `{"name","value"}`
   * (así los manda el $resource de AngularJS); la clave de la query no importa.
   * `fijos` son los filtros propios de cada pantalla y ganan sobre los de la tabla.
   * `url` apunta a `/visita` de saul2, salvo el listado de tareas.
   */
  private listar(
    consulta: VisitaListadoConsulta,
    fijos: Record<string, string>,
    url = `${this.baseUrl}/visita`,
  ): Observable<VisitaListadoRespuesta> {
    const pares: [string, string | number][] = [
      ['currentPage', consulta.page],
      ['numPerPage', consulta.pageSize],
      ['orderBy', consulta.orderBy ?? 'idsolicitud'],
      ['orderDir', consulta.orderDir ?? 'ASC'],
    ];
    const filtros = { ...consulta.filtros, ...fijos };
    for (const [name, value] of Object.entries(filtros)) {
      if (String(value).trim() !== '') {
        pares.push([name, value]);
      }
    }

    let params = new HttpParams();
    pares.forEach(([name, value], i) => {
      params = params.set(String(i), JSON.stringify({ name, value }));
    });

    return this.http.get<VisitaListadoRespuesta>(url, { params });
  }
}

/** Pasa la entidad Visita de SAUL a los textos del encabezado. Lo que no viene queda vacío o null. */
export function aEncabezadoVisita(visita: VisitaDetalle): VisitaEncabezado {
  return {
    consecutivo: visita.idVisita,
    estado: textoOVacio(visita.estado?.nombre),
    visitador: nombrePersona(visita.visitador),
    revisor: nombrePersona(visita.supervisor),
    tipoVisita: textoOVacio(visita.tipoVisita?.descripcion),
    radicadoSolicitud: textoONull(visita.solicitud?.radicado),
    radicadoRespuesta: textoONull(visita.solicitud?.radicadohijo),
    radicadoInspeccion: textoONull(visita.radicadoInspeccion),
  };
}

function nombrePersona(persona: PersonaSaulRaw | null | undefined): string {
  return [persona?.firstName, persona?.lastName]
    .map((parte) => textoOVacio(parte))
    .filter((parte) => parte.length > 0)
    .join(' ');
}

/**
 * Acepta cualquier valor: SAUL a veces manda números u otros tipos donde se espera texto,
 * y `.trim()` sobre un número rompería el encabezado de esa visita.
 */
function textoOVacio(texto: unknown): string {
  if (texto === null || texto === undefined || typeof texto === 'object') {
    return '';
  }
  return String(texto).trim();
}

function textoONull(texto: unknown): string | null {
  return textoOVacio(texto) || null;
}

/** Multipart de SAUL: el archivo viaja como `files[codigo][file]`, no como texto. */
export function cuerpoImagenVisita(idVisita: number, campo: VisitaCampo, archivo: File): FormData {
  const body = new FormData();
  body.append('idVisita', String(idVisita));
  body.append('data[0][codigo]', campo.codigo);
  body.append('data[0][tipoItem]', campo.tipo);
  body.append('data[0][valor]', serializarValorVisita(campo.valor));
  body.append(`files[${campo.codigo}][file]`, archivo, archivo.name);
  return body;
}
