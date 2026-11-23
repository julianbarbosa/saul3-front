import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ControlSancionesExpedienteService } from '../../../core/services/control-sanciones-expediente.service';
import { ExpedienteListadoItem, InspeccionItem } from '../../../core/interfaces/control-sanciones-expediente.interface';
import { PermisosService } from '../../../core/services/permisos.service';
import { ModalMensajeComponent } from '../../../shared/components/modal-mensaje/modal-mensaje';
import { esRespuestaExitosaSaul2, fechaDesdeLegacy } from '../utils/fecha-saul2.util';

const ESTADOS_EXPEDIENTE = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'aprobada', label: 'Aprobado' },
  { value: 'rechazado', label: 'Rechazado' },
  { value: 'enviadotesoreria', label: 'Enviado a tesorería' },
  { value: 'cerrarporpago', label: 'Cerrado por pago' },
  { value: 'devueltoportesoreria', label: 'Devuelto por tesorería' },
] as const;

@Component({
  selector: 'app-registrar-movimiento-expediente-multiple',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ModalMensajeComponent],
  templateUrl: './registrar-movimiento-expediente-multiple.component.html',
  styleUrl: './registrar-movimiento-expediente-multiple.component.css',
})
export class RegistrarMovimientoExpedienteMultipleComponent implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);

  readonly api = inject(ControlSancionesExpedienteService);
  readonly estados = ESTADOS_EXPEDIENTE;
  readonly permisos = inject(PermisosService);

  busqueda: { estado?: string; inspeccion?: number | null } = {};
  data: ExpedienteListadoItem[] = [];
  inspecciones: InspeccionItem[] = [];
  filterId = '';
  filterFormato = '';
  cantidadCheckeado = 0;
  cargando = false;
  mensaje = '';
  modalMensajeVisible = false;
  modalMensajeTexto = '';
  modalMensajeVariante: 'info' | 'exito' | 'error' = 'info';
  private modalTrasRegistroExitoso = false;
  /** True tras pulsar Buscar (para mensaje sin resultados). */
  busquedaRealizada = false;

  ngOnInit(): void {
    this.api.listarInspecciones().subscribe((filas) => {
      this.actualizarVista(() => {
        this.inspecciones = filas;
      });
    });
  }

  /** Evita NG0100 al actualizar estado tras HTTP. */
  private actualizarVista(fn: () => void): void {
    setTimeout(() => {
      fn();
      this.cdr.detectChanges();
    });
  }

  requiereInspeccion(): boolean {
    const e = this.busqueda.estado;
    return e === 'rechazado' || e === 'cerrarporpago' || e === 'enviadotesoreria';
  }

  buscar(): void {
    if (!this.busqueda.estado) {
      return;
    }
    this.cargando = true;
    this.mensaje = '';
    this.busquedaRealizada = false;
    this.api.listarExpedientesPorEstado(this.busqueda.estado, this.busqueda.inspeccion ?? '').subscribe({
      next: (filas) => {
        this.actualizarVista(() => {
          this.busquedaRealizada = true;
          this.data = filas.map((row) => ({ ...row, isChecked: false }));
          this.cantidadCheckeado = this.data.filter((r) => r.isChecked).length;
          if (!this.data.length) {
            this.mensaje = 'No se encontraron expedientes para el estado seleccionado.';
          }
          this.cargando = false;
        });
      },
      error: () => {
        this.actualizarVista(() => {
          this.mensaje = 'Error al consultar expedientes.';
          this.cargando = false;
        });
      },
    });
  }

  actualizarCantidad(): void {
    this.actualizarVista(() => {
      this.cantidadCheckeado = this.data.filter((r) => r.isChecked).length;
    });
  }

  expedientesFiltrados(): ExpedienteListadoItem[] {
    return this.data.filter((item) => {
      const idOk = !this.filterId || String(item.id).includes(this.filterId.trim());
      const fmtOk = !this.filterFormato || (item.formato ?? '').includes(this.filterFormato.trim());
      return idOk && fmtOk;
    });
  }

  idsSeleccionados(): number[] {
    return this.data.filter((r) => r.isChecked).map((r) => r.id);
  }

  registrarMovimiento(codigoEstado: string): void {
    const ids = this.idsSeleccionados();
    if (!ids.length) {
      this.mensaje = 'Seleccione al menos un expediente.';
      return;
    }
    this.cargando = true;
    this.api
      .registrarMovimientoMultiple({
        idComparendo: null,
        data: ids,
        comentario: '',
        estado: codigoEstado,
      })
      .subscribe({
        next: (r) => {
          this.actualizarVista(() => {
            this.cargando = false;
            const exito = esRespuestaExitosaSaul2(r);
            this.mostrarModalResultadoRegistro(
              r.msg ?? (exito ? 'Se registró el movimiento.' : 'No se pudo registrar el movimiento.'),
              exito,
            );
          });
        },
        error: () => {
          this.actualizarVista(() => {
            this.cargando = false;
            this.mostrarModalResultadoRegistro('Error al registrar movimiento.', false);
          });
        },
      });
  }

  mostrarModalResultadoRegistro(texto: string, exito: boolean): void {
    this.modalMensajeTexto = texto;
    this.modalMensajeVariante = exito ? 'exito' : 'error';
    this.modalTrasRegistroExitoso = exito;
    this.modalMensajeVisible = true;
  }

  cerrarModalMensajeRegistro(): void {
    this.modalMensajeVisible = false;
    if (this.modalTrasRegistroExitoso) {
      this.modalTrasRegistroExitoso = false;
      this.limpiar();
    }
  }

  limpiar(): void {
    this.data = [];
    this.busqueda = {};
    this.filterId = '';
    this.filterFormato = '';
    this.cantidadCheckeado = 0;
    this.busquedaRealizada = false;
    this.mensaje = '';
  }

  fmt(val: unknown): string {
    const d = fechaDesdeLegacy(val as never);
    return d ? d.toLocaleString('es-CO') : '';
  }

}