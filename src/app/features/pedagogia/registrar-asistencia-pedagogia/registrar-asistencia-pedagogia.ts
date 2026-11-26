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
import { ColumnaTabla, Table } from '../../../shared/components/table/table';
import {
  PedagogiaService,
  RegistrarAsistenciaPedagogiaPayload,
} from '../../../core/services/pedagogia.service';

interface AsistentePedagogia {
  id: string;
  idInscripcion: string;
  asistio: boolean;
  numProgramacion: string;
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
  imports: [RouterLink, Table],
  templateUrl: './registrar-asistencia-pedagogia.html',
})
export class RegistrarAsistenciaPedagogia implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly pedagogiaService = inject(PedagogiaService);

  readonly programacion = signal<DetalleProgramacion | null>(null);
  readonly asistentes = signal<AsistentePedagogia[]>([]);
  private readonly filtrosActivos = signal({ identificacion: '', nombreInfractor: '' });
  readonly cargando = signal(false);
  readonly imprimiendo = signal(false);
  readonly errorImpresion = signal('');
  readonly error = signal('');
  readonly programacionId = signal<number | null>(null);
  readonly confirmacionVisible = signal(false);
  readonly guardandoAsistencia = signal(false);
  readonly resultadoOperacion = signal<{ tipo: 'exito' | 'error'; mensaje: string } | null>(null);

  private readonly celdaAsistio =
    viewChild<TemplateRef<{ $implicit: AsistentePedagogia }>>('celdaAsistio');

  readonly columnas = computed<ColumnaTabla[]>(() => [
    { label: 'Asistió', campo: null, width: '7%', template: this.celdaAsistio() },
    { label: 'Num Programación', campo: 'numProgramacion', width: '11%', activateFilter: false },
    {
      label: 'Identificación',
      campo: 'identificacion',
      width: '11%',
      activateFilter: false,
      filtroEntrada: true,
      filtroInputmode: 'numeric',
      filtroPlaceholder: 'Identificación',
    },
    {
      label: 'Nombre Infractor',
      campo: 'nombreInfractor',
      width: '17%',
      activateFilter: false,
      filtroEntrada: true,
      filtroPlaceholder: 'Nombre Infractor',
    },
    { label: 'Contacto', campo: 'contacto', width: '11%', activateFilter: false },
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
    const identificacion = this.normalizarTexto(filtros.identificacion);
    const nombre = this.normalizarTexto(filtros.nombreInfractor);

    return this.asistentes().filter((asistente) => {
      return (
        this.normalizarTexto(asistente.identificacion).includes(identificacion) &&
        this.normalizarTexto(asistente.nombreInfractor).includes(nombre)
      );
    });
  }

  private normalizarTexto(valor: string): string {
    return valor
      .trim()
      .toLocaleLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
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
    this.resultadoOperacion.set(null);
    this.confirmacionVisible.set(true);
  }

  cancelarConfirmacion(): void {
    if (!this.guardandoAsistencia()) {
      this.confirmacionVisible.set(false);
    }
  }

  confirmarAsistencia(): void {
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
          this.resultadoOperacion.set({
            tipo: 'error',
            mensaje: respuesta.msg ?? respuesta.message ?? 'No se pudo registrar la asistencia.',
          });
          return;
        }

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
        this.resultadoOperacion.set({
          tipo: 'error',
          mensaje:
            cuerpo?.message ??
            cuerpo?.msg ??
            'No fue posible registrar la asistencia. Intente nuevamente.',
        });
        console.error('Error al registrar asistencia de pedagogía:', err);
      },
    });
  }

  private cargarAsistentes(id: string): void {
    this.cargando.set(true);
    this.error.set('');

    this.pedagogiaService.listarAsistentesProgramacion(id).subscribe({
      next: (respuesta) => {
        this.cargando.set(false);
        const resultado = this.extraerRespuesta(respuesta, id);
        if (resultado.error) {
          this.error.set(resultado.error);
          this.asistentes.set([]);
          return;
        }

        this.programacion.set(resultado.programacion);
        this.asistentes.set(resultado.asistentes);
        this.page = 1;
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.asistentes.set([]);
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

  private extraerRespuesta(
    respuesta: ResponseI,
    idProgramacion: string,
  ): {
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
        numProgramacion: this.texto(
          this.obtener(
            registro,
            'numProgramacion',
            'numeroProgramacion',
            'idProgramacion',
            'idprogramacionpedagogia',
          ) ?? idProgramacion,
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
