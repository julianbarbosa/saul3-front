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
import { RouterLink } from '@angular/router';
import { ColumnaTabla, Table } from '../../../shared/components/table/table';
import { ResponseI } from '../../../core/interfaces/response.interface';
import { PedagogiaService } from '../../../core/services/pedagogia.service';

type FilaProgramacion = Record<string, unknown>;

@Component({
  selector: 'app-lista-programacion-pedagogia',
  imports: [Table, RouterLink],
  templateUrl: './lista-programacion-pedagogia.html',
})
export class ListaProgramacionPedagogia implements OnInit {
  private readonly pedagogiaService = inject(PedagogiaService);

  private readonly celdaAcciones =
    viewChild<TemplateRef<{ $implicit: FilaProgramacion }>>('celdaAcciones');

  readonly columnas = computed<ColumnaTabla[]>(() => [
    { label: 'Acciones', campo: null, width: '15%', template: this.celdaAcciones() },
    { label: 'Id', campo: 'id', width: '5%', activateFilter: false },
    { label: 'Fecha', campo: 'fecha', width: '8%', activateFilter: false },
    { label: 'Hora', campo: 'hora', width: '7%', activateFilter: false },
    { label: 'Cupo', campo: 'cupo', width: '7%', activateFilter: false },
    { label: 'Cupo usado', campo: 'cupoUsado', width: '9%', activateFilter: false },
    { label: 'Pedagogía', campo: 'nombre', width: '19%', activateFilter: false },
    { label: 'Lugar', campo: 'lugar', width: '11%', activateFilter: false },
    { label: 'Creado', campo: 'createdAt', width: '11%', activateFilter: false },
    { label: 'Usuario', campo: 'usuario', width: '8%', activateFilter: false },
  ]);

  readonly filas = signal<FilaProgramacion[]>([]);
  readonly cargando = signal(false);
  readonly error = signal('');

  page = 1;
  pageSize = 10;

  ngOnInit(): void {
    this.cargarListado();
  }

  filasPagina(): FilaProgramacion[] {
    const inicio = (this.page - 1) * this.pageSize;
    return this.filas().slice(inicio, inicio + this.pageSize);
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

  private cargarListado(): void {
    this.cargando.set(true);
    this.error.set('');

    this.pedagogiaService.listarProgramacionesPedagogia().subscribe({
      next: (respuesta) => {
        this.cargando.set(false);
        const resultado = this.extraerFilas(respuesta);
        if (resultado.error) {
          this.error.set(resultado.error);
          this.filas.set([]);
          return;
        }

        this.filas.set(resultado.filas);
        this.page = 1;
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.filas.set([]);
        const httpError = err instanceof HttpErrorResponse ? err : null;
        const cuerpo = httpError?.error as { message?: string; msg?: string } | null;
        this.error.set(
          cuerpo?.message ??
            cuerpo?.msg ??
            (httpError?.status === 401
              ? 'No tiene permiso para consultar las programaciones de pedagogía.'
              : 'No fue posible cargar las programaciones de pedagogía.'),
        );
        console.error('Error al listar programaciones de pedagogía:', err);
      },
    });
  }

  private extraerFilas(respuesta: ResponseI): { filas: FilaProgramacion[]; error: string | null } {
    if (respuesta.success === false) {
      return {
        filas: [],
        error: respuesta.msg ?? respuesta.message ?? 'No fue posible cargar las programaciones.',
      };
    }

    let data: unknown = respuesta.data;
    if (data && typeof data === 'object' && !Array.isArray(data) && 'data' in data) {
      data = (data as { data: unknown }).data;
    }

    if (!Array.isArray(data)) {
      return { filas: [], error: 'El servicio devolvió un formato de listado inesperado.' };
    }

    const filas: FilaProgramacion[] = [];
    for (const item of data) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return { filas: [], error: 'El servicio devolvió un registro de pedagogía inválido.' };
      }

      const registro = item as Record<string, unknown>;
      const obtener = (...nombres: string[]): unknown =>
        nombres.map((nombre) => registro[nombre]).find((valor) => valor !== undefined && valor !== null);
      const mostrar = (valor: unknown): string =>
        valor === undefined || valor === null || valor === '' ? '—' : String(valor);

      filas.push({
        id: mostrar(obtener('id')),
        fecha: mostrar(obtener('fecha')),
        hora: mostrar(obtener('hora')),
        cupo: mostrar(obtener('cupo')),
        cupoUsado: mostrar(obtener('cupoUsado')),
        nombre: mostrar(obtener('nombre')),
        lugar: mostrar(obtener('lugar')),
        createdAt: mostrar(obtener('createdAt')),
        usuario: mostrar(obtener('usuario')),
      });
    }

    return { filas, error: null };
  }
}
