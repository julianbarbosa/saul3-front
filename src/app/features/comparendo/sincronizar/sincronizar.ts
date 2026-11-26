import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Button } from '../../../shared/components/button/button';
import { PageHeader } from '../../../shared/components/header/header';
import { InputText } from '../../../shared/components/input-text/input-text';
import { Select, SelectOption } from '../../../shared/components/select/select';
import { ModalMensajeComponent } from '../../../shared/components/modal-mensaje/modal-mensaje';
import { ComparendoService, TipoDocIdentificacionApi } from '../../../core/services/comparendo.service';

interface TipoIdentificacionOpcion {
  id: number;
  codigo: string;
  nombre: string;
  numDigitos: number | null;
  rnmcId: number | null;
}

interface ResultadoSincronizacion {
  tipo: 'exito' | 'error';
  mensaje: string;
}

const MENSAJE_EXITO_RNMC =
  'Se ha actualizado la base de datos con los comparendos del presunto infractor.';

@Component({
  selector: 'app-sincronizar',
  imports: [Select, InputText, Button, ModalMensajeComponent, PageHeader],
  templateUrl: './sincronizar.html',
  styleUrl: './sincronizar.css',
})
export class Sincronizar implements OnInit {
  private comparendoService = inject(ComparendoService);

  tiposIdentificacion = signal<TipoIdentificacionOpcion[]>([]);
  tipoIdentificacion = signal('CC');
  identificacion = signal('');
  cargando = signal(false);
  cargandoTipos = signal(true);
  errorTipos = signal(false);
  validarCampos = signal(false);
  resultado = signal<ResultadoSincronizacion | null>(null);

  modalMensajeVisible = signal(false);
  modalMensajeTexto = signal('');
  modalMensajeVariante = signal<'info' | 'exito' | 'error'>('info');
  modalMensajeTitulo = signal('Sincronización RNMC');

  opcionesTipoDocumento = computed<SelectOption[]>(() =>
    this.tiposIdentificacion().map((tipo) => ({
      value: tipo.codigo,
      label: tipo.nombre,
    })),
  );

  tiposDisponibles = computed(() => this.tiposIdentificacion().length > 0);

  etiquetaBotonSincronizar = computed(() =>
    this.cargando() ? 'Sincronizando desde RNMC…' : 'Sincronizar',
  );

  placeholderIdentificacion = computed(() => {
    const codigo = this.tipoIdentificacion();
    const tipo = this.tiposIdentificacion().find((t) => t.codigo === codigo);
    if (!tipo) {
      return 'Ingrese el número de documento';
    }
    return tipo.numDigitos
      ? `Ingrese su ${tipo.nombre} (máx. ${tipo.numDigitos} caracteres)`
      : `Ingrese su ${tipo.nombre}`;
  });

  ngOnInit(): void {
    this.cargarTiposIdentificacion();
  }

  onTipoChange(codigo: string): void {
    this.tipoIdentificacion.set(codigo);
    this.resultado.set(null);
  }

  onIdentificacionChange(valor: string): void {
    this.identificacion.set(valor);
    this.resultado.set(null);
  }

  cerrarModalMensaje(): void {
    this.modalMensajeVisible.set(false);
  }

  sincronizar(): void {
    this.validarCampos.set(true);
    this.resultado.set(null);

    const tipo = this.tipoIdentificacion().trim();
    const numero = this.identificacion().trim();

    if (!tipo || !numero) {
      return;
    }

    if (!/^[a-zA-Z0-9.-]+$/.test(numero)) {
      this.mostrarModalMensaje(
        'El número de documento solo puede contener letras, números, punto o guion.',
        'error',
        'Validación',
      );
      return;
    }

    this.cargando.set(true);
    this.comparendoService.sincronizarComparendosDesdeRnmc(tipo, numero).subscribe({
      next: (response) => {
        this.cargando.set(false);
        if (response?.success) {
          const mensaje = (response as { msg?: string }).msg ?? MENSAJE_EXITO_RNMC;
          this.registrarResultado('exito', mensaje);
          this.mostrarModalMensaje(mensaje, 'exito');
          return;
        }
        const mensaje =
          (response as { msg?: string }).msg ?? 'No se pudo completar la sincronización desde RNMC.';
        this.registrarResultado('error', mensaje);
        this.mostrarModalMensaje(mensaje, 'error');
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        const httpErr = err as HttpErrorResponse;
        const cuerpo = httpErr.error as { msg?: string; message?: string } | null;
        const mensaje =
          cuerpo?.msg ??
          cuerpo?.message ??
          (httpErr.status === 422
            ? 'No se encontraron comparendos o la consulta RNMC fue rechazada.'
            : `Error al sincronizar desde RNMC (${httpErr.status ?? 'desconocido'}).`);
        this.registrarResultado('error', mensaje);
        this.mostrarModalMensaje(mensaje, 'error');
        console.error('Error al sincronizar comparendos RNMC:', err);
      },
    });
  }

  private mostrarModalMensaje(
    texto: string,
    variante: 'info' | 'exito' | 'error',
    titulo = 'Sincronización RNMC',
  ): void {
    this.modalMensajeTitulo.set(titulo);
    this.modalMensajeTexto.set(texto);
    this.modalMensajeVariante.set(variante);
    this.modalMensajeVisible.set(true);
  }

  private registrarResultado(tipo: 'exito' | 'error', mensaje: string): void {
    this.resultado.set({ tipo, mensaje });
  }

  private cargarTiposIdentificacion(): void {
    this.cargandoTipos.set(true);
    this.errorTipos.set(false);
    this.comparendoService.getTiposDocIdentificacionRnmc().subscribe({
      next: (response) => {
        const data: TipoDocIdentificacionApi[] = Array.isArray(response) ? response : [];

        const opciones = data.map((item) => ({
          id: item.id,
          codigo: item.tipo,
          nombre: item.nombre || item.descripcion || item.tipo,
          numDigitos: item.numDigitos ?? null,
          rnmcId: item.rnmcId ?? null,
        }));

        this.tiposIdentificacion.set(opciones);
        this.cargandoTipos.set(false);
        this.errorTipos.set(opciones.length === 0);

        const codigoActual = this.tipoIdentificacion();
        if (!opciones.some((t) => t.codigo === codigoActual) && opciones.length > 0) {
          this.tipoIdentificacion.set(opciones[0].codigo);
        }
      },
      error: () => {
        this.tiposIdentificacion.set([]);
        this.cargandoTipos.set(false);
        this.errorTipos.set(true);
      },
    });
  }
}