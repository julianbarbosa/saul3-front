import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  OnInit,
  TemplateRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ResponseI } from '../../../core/interfaces/response.interface';
import { FormViewerField } from '../../../shared/components/form-viewer/form-viewer-field';
import { FormViewer } from '../../../shared/components/form-viewer/form-viewer';
import { PageHeader } from '../../../shared/components/header/header';
import { ColumnaTabla, OpcionFiltro, Table } from '../../../shared/components/table/table';
import {
  PedagogiaService,
  RegistrarAsistenciaPedagogiaPayload,
} from '../../../core/services/pedagogia.service';

interface AsistentePedagogia {
  id: string;
  idInscripcion: string;
  asistio: boolean;
  numeroExpedienteComparendo: string;
  idComparendo: number | null;
  identificacion: string;
  nombreInfractor: string;
  contacto: string;
  fechaComparendo: string;
  fechaPedagogia: string;
  comportamientoContrario: string;
  fechaInscripcion: string;
}

interface DetalleProgramacion {
  nombrePedagogia: string;
  descripcionPedagogia: string;
  lugar: string;
  fecha: string;
  modalidad: string;
  hora: string;
  cupo: string;
  cupoUsado: string;
  cupoLleno: string;
  duracion: string;
  usuario: string;
  updatedAt: string;
  createdAt: string;
}

type Registro = Record<string, unknown>;

@Component({
  selector: 'app-registrar-asistencia-pedagogia',
  imports: [RouterLink, Table, FormViewer, PageHeader],
  templateUrl: './registrar-asistencia-pedagogia.html',
  styleUrl: './registrar-asistencia-pedagogia.css',
})
export class RegistrarAsistenciaPedagogia implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly pedagogiaService = inject(PedagogiaService);

  readonly programacion = signal<DetalleProgramacion | null>(null);
  readonly programacionFields = computed<FormViewerField[]>(() => {
    const d = this.programacion();
    if (!d) {
      return [];
    }
    return [
      { label: 'Pedagogía', value: d.nombrePedagogia, type: 'text', colMd: 12 },
      { label: 'Descripción', value: d.descripcionPedagogia, type: 'text', colMd: 12 },
      { label: 'Lugar', value: d.lugar, type: 'text', colMd: 6 },
      { label: 'Fecha', value: d.fecha+ ' '+d.hora, type: 'text', colMd: 6 },
      { label: 'Modalidad', value: d.modalidad, type: 'text', colMd: 6 },
      { label: 'Duración', value: d.duracion+' minutos', type: 'text', colMd: 6 },
      { label: 'Cupo', value: d.cupo, type: 'text', colMd: 6 },
      { label: 'Cupo usado', value: d.cupoUsado, type: 'text', colMd: 6 },
    ];
  });
  readonly asistentes = signal<AsistentePedagogia[]>([]);
  readonly asistentesMarcados = computed(
    () => this.asistentes().filter((asistente) => asistente.asistio).length,
  );
  private readonly filtrosActivos = signal({ identificacion: '', nombreInfractor: '' });
  readonly cargando = signal(false);
  readonly imprimiendo = signal(false);
  readonly errorImpresion = signal('');
  readonly error = signal('');
  readonly programacionId = signal<number | null>(null);
  readonly confirmacionVisible = signal(false);
  readonly guardandoAsistencia = signal(false);
  readonly asistenciaYaRegistrada = signal(false);
  readonly resultadoOperacion = signal<{ tipo: 'exito' | 'error'; mensaje: string } | null>(null);

  private readonly celdaAsistio =
    viewChild<TemplateRef<{ $implicit: AsistentePedagogia }>>('celdaAsistio');

  private readonly opcionesIdentificacion = signal<OpcionFiltro[]>([]);
  private readonly opcionesNombreInfractor = signal<OpcionFiltro[]>([]);

  readonly columnas = computed<ColumnaTabla[]>(() => [
    { label: 'Asistió', campo: null, width: '7%', template: this.celdaAsistio() },
    {
      label: 'N.º Expediente / Comparendo',
      campo: 'numeroExpedienteComparendo',
      width: '13%',
      activateFilter: false,
    },
    {
      label: 'Identificación',
      campo: 'identificacion',
      width: '10%',
      tipoFiltro: 'seleccion',
      options: this.opcionesIdentificacion(),
    },
    {
      label: 'Nombre Infractor',
      campo: 'nombreInfractor',
      width: '17%',
      tipoFiltro: 'seleccion',
      options: this.opcionesNombreInfractor(),
    },
    { label: 'Contacto', campo: 'contacto', width: '10%', activateFilter: false },
    { label: 'Fecha Comparendo', campo: 'fechaComparendo', width: '13%', activateFilter: false },
    {
      label: 'Comportamiento Contrario',
      campo: 'comportamientoContrario',
      width: '18%',
      activateFilter: false,
    },
    { label: 'Fecha de Inscripción', campo: 'fechaInscripcion', width: '12%', activateFilter: false },
  ]);

  page = 1;
  pageSize = 10;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id || !/^\d+$/.test(id)) {
      this.error.set('El identificador de la programación no es válido.');
      return;
    }

    this.programacionId.set(Number(id));
    this.cargarAsistentes(id);
  }

  filasPagina(): AsistentePedagogia[] {
    const inicio = (this.page - 1) * this.pageSize;
    return this.filasFiltradas().slice(inicio, inicio + this.pageSize);
  }

  totalFiltrado(): number {
    return this.filasFiltradas().length;
  }

  onPaginacion(evento: {
    filter: Record<string, string>;
    page: number;
    pageSize: number;
  }): void {
    this.filtrosActivos.set({
      identificacion: evento.filter['identificacion'] ?? '',
      nombreInfractor: evento.filter['nombreInfractor'] ?? '',
    });
    this.page = evento.page;
    this.pageSize = evento.pageSize;
  }

  onCambioPagina(pagina: number): void {
    this.page = pagina;
  }

  onCambioTamanoPagina(tamano: number): void {
    this.pageSize = tamano;
    this.page = 1;
  }

  private filasFiltradas(): AsistentePedagogia[] {
    const filtros = this.filtrosActivos();
    const identificacion = filtros.identificacion.trim();
    const nombre = filtros.nombreInfractor.trim();

    return this.asistentes().filter((asistente) => {
      const coincideIdentificacion =
        !identificacion || asistente.identificacion === identificacion;
      const coincideNombre = !nombre || asistente.nombreInfractor === nombre;
      return coincideIdentificacion && coincideNombre;
    });
  }

  private sincronizarOpcionesFiltro(asistentes: AsistentePedagogia[]): void {
    const identificaciones = [
      ...new Set(asistentes.map((a) => a.identificacion).filter((v) => v.trim() !== '')),
    ].sort((a, b) => a.localeCompare(b, 'es'));
    const nombres = [
      ...new Set(asistentes.map((a) => a.nombreInfractor).filter((v) => v.trim() !== '')),
    ].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

    this.opcionesIdentificacion.set(
      identificaciones.map((value) => ({ label: value, value })),
    );
    this.opcionesNombreInfractor.set(nombres.map((value) => ({ label: value, value })));
  }

  imprimirAsistencia(): void {
    const idProgramacion = this.programacionId();
    if (!idProgramacion) {
      this.errorImpresion.set('No se pudo identificar la programación para imprimir la asistencia.');
      return;
    }

    this.imprimiendo.set(true);
    this.errorImpresion.set('');
    this.pedagogiaService.imprimirAsistenciaPedagogia(idProgramacion).subscribe({
      next: (archivo) => {
        this.imprimiendo.set(false);
        const url = URL.createObjectURL(archivo);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `asistencia-pedagogia-${idProgramacion}.pdf`;
        enlace.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
      error: (err: unknown) => {
        this.imprimiendo.set(false);
        const httpError = err instanceof HttpErrorResponse ? err : null;
        const cuerpo = httpError?.error as { message?: string; msg?: string } | null;
        this.errorImpresion.set(
          cuerpo?.message ??
            cuerpo?.msg ??
            'No fue posible generar el archivo de asistencia. Intente nuevamente.',
        );
        console.error('Error al imprimir asistencia de pedagogía:', err);
      },
    });
  }

  cambiarAsistencia(asistente: AsistentePedagogia, evento: Event): void {
    const asistio = (evento.target as HTMLInputElement).checked;
    this.asistentes.update((filas) =>
      filas.map((fila) => (fila.id === asistente.id ? { ...fila, asistio } : fila)),
    );
  }

  abrirConfirmacion(): void {
    if (this.asistenciaYaRegistrada()) {
      return;
    }
    this.resultadoOperacion.set(null);
    this.confirmacionVisible.set(true);
  }

  cancelarConfirmacion(): void {
    if (!this.guardandoAsistencia()) {
      this.confirmacionVisible.set(false);
    }
  }

  confirmarAsistencia(): void {
    if (this.asistenciaYaRegistrada() || this.guardandoAsistencia()) {
      return;
    }
    const idProgramacion = this.programacionId();
    const asistentes = this.asistentes();
    if (!idProgramacion) {
      this.confirmacionVisible.set(false);
      this.resultadoOperacion.set({
        tipo: 'error',
        mensaje: 'No se pudo identificar la programación para registrar asistencia.',
      });
      return;
    }

    const data: RegistrarAsistenciaPedagogiaPayload['data'] = [];
    for (const asistente of asistentes) {
      if (asistente.idComparendo === null) {
        this.confirmacionVisible.set(false);
        this.resultadoOperacion.set({
          tipo: 'error',
          mensaje: 'No se pudo identificar un comparendo para registrar asistencia.',
        });
        return;
      }
      data.push({ idComparendo: asistente.idComparendo, check: asistente.asistio });
    }

    const payload: RegistrarAsistenciaPedagogiaPayload = {
      programacionPedagogia: { id: idProgramacion },
      data,
    };

    this.guardandoAsistencia.set(true);
    this.pedagogiaService.registrarAsistenciaPedagogia(payload).subscribe({
      next: (respuesta) => {
        this.guardandoAsistencia.set(false);
        this.confirmacionVisible.set(false);
        if (respuesta.success === false) {
          const mensaje =
            respuesta.msg ?? respuesta.message ?? 'No se pudo registrar la asistencia.';
          if (this.esAsistenciaYaRegistrada(mensaje)) {
            this.asistenciaYaRegistrada.set(true);
          }
          this.resultadoOperacion.set({
            tipo: 'error',
            mensaje,
          });
          return;
        }

        this.asistenciaYaRegistrada.set(true);
        this.resultadoOperacion.set({
          tipo: 'exito',
          mensaje: respuesta.msg ?? respuesta.message ?? 'Asistencia registrada correctamente.',
        });
      },
      error: (err: unknown) => {
        this.guardandoAsistencia.set(false);
        this.confirmacionVisible.set(false);
        const httpError = err instanceof HttpErrorResponse ? err : null;
        const cuerpo = httpError?.error as { message?: string; msg?: string } | null;
        const mensaje = cuerpo?.message ?? cuerpo?.msg ?? null;
        if (this.esAsistenciaYaRegistrada(mensaje)) {
          this.asistenciaYaRegistrada.set(true);
        }
        this.resultadoOperacion.set({
          tipo: 'error',
          mensaje:
            mensaje ??
            'No fue posible registrar la asistencia. Intente nuevamente.',
        });
        console.error('Error al registrar asistencia de pedagogía:', err);
      },
    });
  }

  private esAsistenciaYaRegistrada(mensaje: string | null): boolean {
    return mensaje !== null && /ya\s+(?:fue\s+registrad[ao]|se\s+registr[oó])/i.test(mensaje);
  }

  private cargarAsistentes(id: string): void {
    this.cargando.set(true);
    this.error.set('');

    this.pedagogiaService.listarAsistentesProgramacion(id).subscribe({
      next: (respuesta) => {
        this.cargando.set(false);
        const resultado = this.extraerRespuesta(respuesta);
        if (resultado.error) {
          this.error.set(resultado.error);
          this.asistentes.set([]);
          this.sincronizarOpcionesFiltro([]);
          return;
        }

        this.programacion.set(resultado.programacion);
        this.asistentes.set(resultado.asistentes);
        this.sincronizarOpcionesFiltro(resultado.asistentes);
        this.page = 1;
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.asistentes.set([]);
        this.sincronizarOpcionesFiltro([]);
        const httpError = err instanceof HttpErrorResponse ? err : null;
        const cuerpo = httpError?.error as { message?: string; msg?: string } | null;
        this.error.set(
          cuerpo?.message ??
            cuerpo?.msg ??
            (httpError?.status === 401
              ? 'No tiene permiso para consultar los asistentes de esta programación.'
              : 'No fue posible cargar los asistentes de la programación.'),
        );
        console.error('Error al consultar asistentes de pedagogía:', err);
      },
    });
  }

  private extraerRespuesta(respuesta: ResponseI): {
    asistentes: AsistentePedagogia[];
    programacion: DetalleProgramacion;
    error: string | null;
  } {
    if (respuesta.success === false) {
      return {
        asistentes: [],
        programacion: this.detalleVacio(),
        error: respuesta.msg ?? respuesta.message ?? 'No fue posible cargar los asistentes.',
      };
    }

    const root = this.aRegistro(respuesta.data);
    const nested = root ? this.aRegistro(root['data']) : null;
    const contenedor = nested ?? root;
    const lista =
      Array.isArray(respuesta.data)
        ? respuesta.data
        : this.obtenerLista(contenedor);

    if (!lista) {
      return {
        asistentes: [],
        programacion: this.detalleVacio(),
        error: 'El servicio devolvió un formato de asistentes inesperado.',
      };
    }

    const programacionRecord =
      this.aRegistro(
        this.obtener(root, 'programacion', 'programacionPedagogia', 'programacion_pedagogia') ??
          (lista.length > 0
            ? this.obtener(
                this.aRegistro(lista[0]),
                'programacion',
                'programacionPedagogia',
                'programacion_pedagogia',
              )
            : null),
      ) ?? root;
    const pedagogiaRecord = this.aRegistro(this.obtener(programacionRecord, 'pedagogia'));
    const usuarioRecord = this.aRegistro(this.obtener(programacionRecord, 'usuario'));
    const nombreUsuario = [
      this.obtener(usuarioRecord, 'firstName'),
      this.obtener(usuarioRecord, 'lastName'),
    ]
      .filter((parte) => parte !== undefined && parte !== null && parte !== '')
      .join(' ');
    const asistentes: AsistentePedagogia[] = [];

    for (const [indice, item] of lista.entries()) {
      const registro = this.aRegistro(item);
      if (!registro) {
        return {
          asistentes: [],
          programacion: this.detalleVacio(),
          error: 'El servicio devolvió un registro de asistente inválido.',
        };
      }

      const nombre = this.obtener(registro, 'nombre');
      const apellido = this.obtener(registro, 'apellido');
      const comparendoRecord = this.aRegistro(
        this.obtener(registro, 'comparendo', 'informacionComparendo', 'informacion_comparendo'),
      );
      const nombreCompleto = [nombre, apellido]
        .filter((parte) => parte !== undefined && parte !== null && parte !== '')
        .map(String)
        .join(' ');

      asistentes.push({
        id: this.texto(this.obtener(registro, 'id', 'idInscripcion', 'id_inscripcion') ?? indice),
        idInscripcion: this.texto(
          this.obtener(registro, 'id', 'idInscripcion', 'id_inscripcion'),
        ),
        asistio: this.esAsistenciaMarcada(this.obtener(registro, 'asistio', 'asistencia')),
        numeroExpedienteComparendo: this.texto(
          this.obtener(
            registro,
            'numeroExpediente',
            'numero_expediente',
            'expediente',
            'numero_formato',
            'numeroFormato',
            'numeroComparendo',
            'numero_comparendo',
            'numComparendo',
            'num_comparendo',
          ) ??
            this.obtener(
              comparendoRecord,
              'numeroExpediente',
              'numero_expediente',
              'expediente',
              'numero_formato',
              'numeroFormato',
              'numeroComparendo',
              'numero_comparendo',
              'numComparendo',
              'num_comparendo',
            ),
        ),
        idComparendo: this.numeroId(this.obtener(registro, 'idComparendo', 'id_comparendo')),
        identificacion: this.texto(
          this.obtener(registro, 'identificacion', 'numeroIdentificacion', 'documento'),
        ),
        nombreInfractor: this.texto(
          nombreCompleto ||
            this.obtener(registro, 'nombreInfractor', 'nombre_infractor', 'infractor'),
        ),
        contacto: this.texto(this.obtener(registro, 'contacto', 'telefono', 'celular')),
        fechaComparendo: this.texto(
          this.obtener(registro, 'fechaComparendo', 'fecha_comparendo'),
        ),
        fechaPedagogia: this.texto(this.obtener(registro, 'fechaPedagogia', 'fecha_pedagogia')),
        comportamientoContrario: this.texto(
          this.obtener(
            registro,
            'comportamientoContrario',
            'comportamientocontrario',
            'comportamiento_contrario',
            'descripcion',
          ),
        ),
        fechaInscripcion: this.texto(
          this.obtener(registro, 'fechaInscripcion', 'fecha_inscripcion', 'createdAt'),
        ),
      });
    }

    return {
      asistentes,
      programacion: {
        nombrePedagogia: this.texto(this.obtener(pedagogiaRecord, 'nombre')),
        descripcionPedagogia: this.texto(this.obtener(pedagogiaRecord, 'descripcion')),
        lugar: this.texto(this.obtener(programacionRecord, 'lugar')),
        fecha: this.texto(this.obtener(programacionRecord, 'fecha')),
        modalidad: this.texto(this.obtener(programacionRecord, 'modalidad')),
        hora: this.texto(this.obtener(programacionRecord, 'hora')),
        cupo: this.texto(this.obtener(programacionRecord, 'cupo')),
        cupoUsado: this.texto(this.obtener(programacionRecord, 'cupoUsado')),
        cupoLleno: this.texto(this.obtener(programacionRecord, 'cupoLleno')),
        duracion: this.texto(this.obtener(programacionRecord, 'duracion')),
        usuario: nombreUsuario || '—',
        updatedAt: this.texto(this.obtener(programacionRecord, 'updatedAt')),
        createdAt: this.texto(this.obtener(programacionRecord, 'createdAt')),
      },
      error: null,
    };
  }

  private obtenerLista(contenedor: Registro | null): unknown[] | null {
    if (!contenedor) {
      return null;
    }

    for (const clave of ['asistentes', 'inscritos', 'registros', 'data']) {
      const valor = contenedor[clave];
      if (Array.isArray(valor)) {
        return valor;
      }
    }
    return null;
  }

  private obtener(registro: Registro | null, ...claves: string[]): unknown {
    if (!registro) {
      return undefined;
    }
    return claves
      .map((clave) => registro[clave])
      .find((valor) => valor !== undefined && valor !== null);
  }

  private aRegistro(valor: unknown): Registro | null {
    return valor && typeof valor === 'object' && !Array.isArray(valor)
      ? (valor as Registro)
      : null;
  }

  private texto(valor: unknown): string {
    return valor === undefined || valor === null || valor === '' ? '—' : String(valor);
  }

  private numeroId(valor: unknown): number | null {
    const numero = typeof valor === 'number' ? valor : Number(valor);
    return Number.isSafeInteger(numero) && numero > 0 ? numero : null;
  }

  private esAsistenciaMarcada(valor: unknown): boolean {
    if (valor === true || valor === 1) {
      return true;
    }
    if (typeof valor === 'string') {
      return ['1', 'true', 'si', 'sí', 'asistió'].includes(valor.trim().toLowerCase());
    }
    return false;
  }

  private detalleVacio(): DetalleProgramacion {
    return {
      nombrePedagogia: '—',
      descripcionPedagogia: '—',
      lugar: '—',
      fecha: '—',
      modalidad: '—',
      hora: '—',
      cupo: '—',
      cupoUsado: '—',
      cupoLleno: '—',
      duracion: '—',
      usuario: '—',
      updatedAt: '—',
      createdAt: '—',
    };
  }
}
