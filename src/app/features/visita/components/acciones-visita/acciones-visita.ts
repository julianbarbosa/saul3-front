import { Component, EventEmitter, inject, Input, OnChanges, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import {
  VisitaAccionRespuesta,
  VisitaListadoFila,
} from '../../../../core/interfaces/visita.interface';
import { AuthService } from '../../../../core/services/auth.service';
import { VisitaService } from '../../../../core/services/visita.service';
import { ID_VISITA_GESTION_SESION } from '../../gestion/gestion';

/** Roles de SAUL que habilitan cada acción (los mismos que valida el backend). */
const ROL_ANULAR_VISITA = 'controlconstrucciones_anularvisita';
const ROL_ANULAR_ASIGNACION = 'controlconstrucciones_anularasignacion';
const ROL_PASAR_CONTROL_POSTERIOR = 'controlconstrucciones_pasarcontrolposterior';
/** En SAUL, editar el radicado usa el mismo rol de anular visita. */
const ROL_EDITAR_RADICADO = ROL_ANULAR_VISITA;

/**
 * Modal «Acciones» de una visita. Lo usan las tres pantallas de listado.
 * Hace las llamadas al backend y avisa con `actualizado` para que la pantalla recargue.
 */
@Component({
  selector: 'app-acciones-visita',
  imports: [FormsModule],
  templateUrl: './acciones-visita.html',
  styleUrl: './acciones-visita.css',
})
export class AccionesVisita implements OnChanges {
  private readonly visitaService = inject(VisitaService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  /** Visita seleccionada. `null` = modal cerrado. */
  @Input() visita: VisitaListadoFila | null = null;
  @Output() cerrar = new EventEmitter<void>();
  @Output() actualizado = new EventEmitter<void>();

  readonly procesando = signal(false);
  readonly mensaje = signal<{ tipo: 'success' | 'danger'; texto: string } | null>(null);
  readonly editandoRadicado = signal(false);
  nuevoRadicado = '';

  private readonly roles = new Set(this.authService.obtenerUsuario()?.roles ?? []);

  ngOnChanges(): void {
    this.mensaje.set(null);
    this.editandoRadicado.set(false);
    this.nuevoRadicado = this.visita?.radicado ?? '';
  }

  get esEmitida(): boolean {
    const v = this.visita;
    return v?.nombreEstado === 'Emitido' || (v?.codigoEstado ?? '').toLowerCase() === 'emitido';
  }

  get puedeEditarRadicado(): boolean {
    return !this.esEmitida && this.roles.has(ROL_EDITAR_RADICADO);
  }

  get puedeAnularAsignacion(): boolean {
    return this.roles.has(ROL_ANULAR_ASIGNACION);
  }

  get puedePasarControlPosterior(): boolean {
    const v = this.visita;
    const pendiente =
      v?.nombreEstado === 'Pendiente por visita' ||
      (v?.codigoEstado ?? '').toLowerCase() === 'pendientevisita';
    return (
      pendiente &&
      v?.nombreTipoSolicitud === 'Control Preventivo' &&
      this.roles.has(ROL_PASAR_CONTROL_POSTERIOR)
    );
  }

  get puedeAnularVisita(): boolean {
    return !this.esEmitida && this.roles.has(ROL_ANULAR_VISITA);
  }

  /** Abre la gestión de la visita en ssjfront (`/visita/gestionar`, sin id en la URL). */
  gestionar(): void {
    const v = this.visita;
    if (!v?.idvisita) {
      return;
    }
    sessionStorage.setItem(ID_VISITA_GESTION_SESION, String(v.idvisita));
    void this.router.navigate(['/visita/gestionar'], { state: { idVisita: v.idvisita } });
    this.cerrar.emit();
  }

  verHistorial(): void {
    if (this.visita) {
      this.abrirEnSaul(`/solicitud/verhistorial/${this.visita.idsolicitud}`);
    }
  }

  observar(): void {
    if (this.visita) {
      this.abrirEnSaul(`/visita/observar/${this.visita.idvisita}`);
    }
  }

  guardarRadicado(): void {
    const radicado = this.nuevoRadicado.trim();
    if (!this.visita || !radicado) {
      this.mensaje.set({ tipo: 'danger', texto: 'Debe ingresar el número de radicado.' });
      return;
    }
    this.ejecutar(
      this.visitaService.editarRadicado(this.visita.idvisita, radicado),
      'Radicado actualizado.',
    );
  }

  anularAsignacion(): void {
    if (this.visita && confirm('¿Está seguro que desea anular la asignación de esta visita?')) {
      this.ejecutar(
        this.visitaService.anularAsignacion(this.visita.idvisita),
        'Asignación anulada.',
      );
    }
  }

  pasarControlPosterior(): void {
    const aviso =
      '¿Está seguro que desea pasar esta visita a control posterior? ' +
      'Este cambio es irreversible y perderá toda la información de la visita de control preventivo.';
    if (this.visita && confirm(aviso)) {
      this.ejecutar(
        this.visitaService.pasarControlPosterior(this.visita.idvisita),
        'La visita se cambió a control posterior.',
      );
    }
  }

  anularVisita(): void {
    if (this.visita && confirm('¿Está seguro que desea anular esta visita?')) {
      this.ejecutar(this.visitaService.anularVisita(this.visita.idvisita), 'Visita anulada.');
    }
  }

  private ejecutar(peticion: Observable<VisitaAccionRespuesta>, textoExito: string): void {
    this.procesando.set(true);
    this.mensaje.set(null);
    peticion.subscribe({
      next: (r) => {
        this.procesando.set(false);
        if (r?.success) {
          this.mensaje.set({ tipo: 'success', texto: r.message || r.msg || textoExito });
          this.editandoRadicado.set(false);
          this.actualizado.emit();
        } else {
          this.mensaje.set({ tipo: 'danger', texto: r?.message || r?.msg || 'Error desconocido.' });
        }
      },
      error: (e) => {
        this.procesando.set(false);
        const texto = e?.error?.msg || e?.error?.message || 'Ocurrió un error. Intente nuevamente.';
        this.mensaje.set({ tipo: 'danger', texto });
      },
    });
  }

  private abrirEnSaul(rutaHash: string): void {
    window.open(`${environment.SAUL1_URL}#!${rutaHash}`, '_blank', 'noopener');
  }
}
