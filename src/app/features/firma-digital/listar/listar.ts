import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ColumnaTabla,
  Table,
} from '../../../shared/components/table/table';
import { PageHeader } from '../../../shared/components/header/header';
import { ModalMensajeComponent } from '../../../shared/components/modal-mensaje/modal-mensaje';
import {
  ProcesoFirmaListadoItem,
  ProcesoFirmaService,
} from '../../../core/services/proceso-firma.service';

const TAMANOS_PAGINA = [10, 20, 50];

function textoCelda(valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') {
    return '—';
  }
  return String(valor);
}

@Component({
  selector: 'app-listar',
  imports: [Table, ModalMensajeComponent, PageHeader],
  templateUrl: './listar.html',
  styleUrl: './listar.css',
})
export class Listar implements OnInit {
  private readonly procesoFirmaService = inject(ProcesoFirmaService);

  readonly titulo = 'Expedientes en proceso de firma';
  readonly descripcion =
    'Permite listar los expedientes en proceso de firma por Control a Sanciones.';

  private readonly todasLasFilas = signal<ProcesoFirmaListadoItem[]>([]);
  readonly total = signal(0);
  readonly cargando = signal(false);

  page = 1;
  pageSize = 10;
  readonly tamanosPagina = TAMANOS_PAGINA;

  modalMensajeVisible = signal(false);
  modalMensajeTexto = signal('');
  modalMensajeVariante = signal<'info' | 'exito' | 'error'>('info');
  modalMensajeTitulo = signal('Procesos de firma');

  readonly columnas: ColumnaTabla[] = [
    { label: 'Id', campo: 'id', width: '10%', activateFilter: false },
    { label: 'Estado', campo: 'estado', width: '12%', activateFilter: false },
    {
      label: 'Cantidad archivos',
      campo: 'numero_archivos',
      width: '12%',
      activateFilter: false,
    },
    { label: 'Peso archivos', campo: 'peso_total_bytes', width: '12%', activateFilter: false },
    { label: 'Fecha creación', campo: 'created_at', width: '16%', activateFilter: false },
    { label: 'Observaciones', campo: 'observaciones', width: '38%', activateFilter: false },
  ];

  readonly filasPagina = computed(() => {
    const inicio = (this.page - 1) * this.pageSize;
    return this.todasLasFilas().slice(inicio, inicio + this.pageSize);
  });

  ngOnInit(): void {
    this.cargarListado();
  }

  onPaginacion(evento: {
    filter: Record<string, string>;
    page: number;
    pageSize: number;
  }): void {
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

  cerrarModalMensaje(): void {
    this.modalMensajeVisible.set(false);
  }

  private cargarListado(): void {
    this.cargando.set(true);
    this.procesoFirmaService.listarProcesosFirma().subscribe({
      next: (data) => {
        this.cargando.set(false);
        const filas = data.map((fila) => ({
          ...fila,
          estado: textoCelda(fila.estado),
          peso_total_bytes: textoCelda(fila.peso_total_bytes),
          created_at: textoCelda(fila.created_at),
          observaciones: textoCelda(fila.observaciones),
        }));
        this.todasLasFilas.set(filas);
        this.total.set(filas.length);
        this.page = 1;

        if (filas.length === 0) {
          this.mostrarModalMensaje('No se encontraron procesos de firma', 'info');
        }
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.todasLasFilas.set([]);
        this.total.set(0);
        const httpErr = err as HttpErrorResponse;
        const cuerpo = httpErr.error as { message?: string; msg?: string } | null;
        const mensaje =
          cuerpo?.message ??
          cuerpo?.msg ??
          (httpErr.status === 401
            ? 'Usted no tiene permiso para realizar esta acción.'
            : 'Error consultando procesos de firma.');
        this.mostrarModalMensaje(mensaje, 'error');
        console.error('Error al listar procesos de firma:', err);
      },
    });
  }

  private mostrarModalMensaje(
    texto: string,
    variante: 'info' | 'exito' | 'error',
    titulo = 'Procesos de firma',
  ): void {
    this.modalMensajeTitulo.set(titulo);
    this.modalMensajeTexto.set(texto);
    this.modalMensajeVariante.set(variante);
    this.modalMensajeVisible.set(true);
  }
}