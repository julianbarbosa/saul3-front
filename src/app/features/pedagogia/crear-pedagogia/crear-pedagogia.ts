import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, TemplateRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ResponseI } from '../../../core/interfaces/response.interface';
import {
  ComportamientoContrario,
  CrearPedagogiaPayload,
  PedagogiaService,
} from '../../../core/services/pedagogia.service';
import { ColumnaTabla, Table } from '../../../shared/components/table/table';

type Registro = Record<string, unknown>;

@Component({
  selector: 'app-crear-pedagogia',
  imports: [ReactiveFormsModule, RouterLink, Table],
  templateUrl: './crear-pedagogia.html',
})
export class CrearPedagogia implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly pedagogiaService = inject(PedagogiaService);

  readonly formulario = this.formBuilder.nonNullable.group({
    nombre: ['', Validators.required],
    descripcion: ['', Validators.required],
    tipo: ['', Validators.required],
  });
  readonly tipos = ['Pedagogía', 'Actividad Comunitaria'];
  readonly comportamientos = signal<ComportamientoContrario[]>([]);
  readonly comportamientosFiltrados = computed(() => {
    const termino = this.normalizar(this.busqueda());
    return this.comportamientos().filter((comportamiento) =>
      this.normalizar(comportamiento.descripcion).includes(termino),
    );
  });
  readonly filasPagina = computed(() => {
    const inicio = (this.page - 1) * this.pageSize;
    return this.comportamientosFiltrados().slice(inicio, inicio + this.pageSize);
  });
  readonly columnas = computed<ColumnaTabla[]>(() => [
    { label: 'Seleccionar', campo: null, width: '8%', template: this.celdaSeleccion() },
    {
      label: 'Comportamiento contrario',
      campo: 'descripcion',
      width: '92%',
      activateFilter: false,
    },
  ]);
  readonly seleccionados = signal<Set<number>>(new Set());
  readonly busqueda = signal('');
  readonly cargandoComportamientos = signal(false);
  readonly guardando = signal(false);
  readonly formularioEnviado = signal(false);
  readonly errorComportamientos = signal('');
  readonly resultado = signal<{ tipo: 'exito' | 'error'; mensaje: string } | null>(null);

  private readonly celdaSeleccion =
    viewChild<TemplateRef<{ $implicit: ComportamientoContrario }>>('celdaSeleccion');

  page = 1;
  pageSize = 10;

  ngOnInit(): void {
    this.cargarComportamientos();
  }

  totalFiltrado(): number {
    return this.comportamientosFiltrados().length;
  }

  onBusqueda(evento: Event): void {
    this.busqueda.set((evento.target as HTMLInputElement).value);
    this.page = 1;
  }

  onPaginacion(evento: { page: number; pageSize: number }): void {
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

  estaSeleccionado(id: number): boolean {
    return this.seleccionados().has(id);
  }

  cambiarSeleccion(comportamiento: ComportamientoContrario, evento: Event): void {
    const marcado = (evento.target as HTMLInputElement).checked;
    this.seleccionados.update((seleccionados) => {
      const actualizados = new Set(seleccionados);
      if (marcado) {
        actualizados.add(comportamiento.id);
      } else {
        actualizados.delete(comportamiento.id);
      }
      return actualizados;
    });
  }

  guardar(): void {
    this.formularioEnviado.set(true);
    this.resultado.set(null);
    if (this.formulario.invalid || this.guardando()) {
      this.formulario.markAllAsTouched();
      return;
    }

    const valores = this.formulario.getRawValue();
    const payload: CrearPedagogiaPayload = {
      tipo: valores.tipo,
      nombre: valores.nombre.trim(),
      descripcion: valores.descripcion.trim(),
      comportamientosIds: [...this.seleccionados()],
    };

    this.guardando.set(true);
    this.pedagogiaService.crearPedagogia(payload).subscribe({
      next: (respuesta) => {
        this.guardando.set(false);
        if (respuesta.success === false) {
          this.resultado.set({
            tipo: 'error',
            mensaje: respuesta.msg ?? respuesta.message ?? 'No se pudo crear la pedagogía.',
          });
          return;
        }

        this.resultado.set({
          tipo: 'exito',
          mensaje: respuesta.msg ?? respuesta.message ?? 'Pedagogía creada correctamente.',
        });
        this.formulario.reset();
        this.formularioEnviado.set(false);
        this.seleccionados.set(new Set());
      },
      error: (error: unknown) => {
        this.guardando.set(false);
        const httpError = error instanceof HttpErrorResponse ? error : null;
        const cuerpo = this.aRegistro(httpError?.error);
        this.resultado.set({
          tipo: 'error',
          mensaje:
            this.textoError(cuerpo?.['message']) ??
            this.textoError(cuerpo?.['msg']) ??
            'No fue posible crear la pedagogía. Intente nuevamente.',
        });
        console.error('Error al crear pedagogía:', error);
      },
    });
  }

  private cargarComportamientos(): void {
    this.cargandoComportamientos.set(true);
    this.errorComportamientos.set('');

    this.pedagogiaService.listarComportamientosContrarios().subscribe({
      next: (respuesta) => {
        this.cargandoComportamientos.set(false);
        const resultado = this.extraerComportamientos(respuesta);
        if (resultado.error) {
          this.errorComportamientos.set(resultado.error);
          this.comportamientos.set([]);
          return;
        }
        this.comportamientos.set(resultado.comportamientos);
      },
      error: (error: unknown) => {
        this.cargandoComportamientos.set(false);
        this.comportamientos.set([]);
        const httpError = error instanceof HttpErrorResponse ? error : null;
        const cuerpo = this.aRegistro(httpError?.error);
        this.errorComportamientos.set(
          this.textoError(cuerpo?.['message']) ??
            this.textoError(cuerpo?.['msg']) ??
            (httpError?.status === 401
              ? 'No tiene permiso para consultar los comportamientos contrarios.'
              : 'No fue posible cargar los comportamientos contrarios.'),
        );
        console.error('Error al consultar comportamientos contrarios:', error);
      },
    });
  }

  private extraerComportamientos(
    respuesta: unknown,
  ): { comportamientos: ComportamientoContrario[]; error: string | null } {
    const registro = this.aRegistro(respuesta);
    if (registro?.['success'] === false) {
      return {
        comportamientos: [],
        error:
          this.textoError(registro['msg']) ??
          this.textoError(registro['message']) ??
          'No fue posible cargar los comportamientos contrarios.',
      };
    }

    const data = Array.isArray(respuesta)
      ? respuesta
      : registro && Array.isArray(registro['data'])
        ? registro['data']
        : null;
    if (!data) {
      return {
        comportamientos: [],
        error: 'El servicio devolvió un listado de comportamientos inesperado.',
      };
    }

    const comportamientos: ComportamientoContrario[] = [];
    for (const item of data) {
      const fila = this.aRegistro(item);
      const id = fila?.['id'];
      const descripcion = fila?.['descripcion'];
      if (
        typeof id !== 'number' ||
        !Number.isSafeInteger(id) ||
        typeof descripcion !== 'string'
      ) {
        return {
          comportamientos: [],
          error: 'El servicio devolvió un comportamiento contrario inválido.',
        };
      }
      comportamientos.push({ id, descripcion });
    }

    return { comportamientos, error: null };
  }

  private normalizar(valor: string): string {
    return valor
      .trim()
      .toLocaleLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private aRegistro(valor: unknown): Registro | null {
    return valor && typeof valor === 'object' && !Array.isArray(valor)
      ? (valor as Registro)
      : null;
  }

  private textoError(valor: unknown): string | null {
    return typeof valor === 'string' && valor.trim() ? valor : null;
  }
}
