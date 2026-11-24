import { Component, EventEmitter, Input, Output } from '@angular/core';

import { VisitaCampo } from '../../../../core/interfaces/visita.interface';
import { IMAGEN_ACCEPT } from '../../../../core/services/validador-imagen.service';
import { Button } from '../../../../shared/components/button/button';
import { EditorImagenVisita } from '../editor-imagen-visita/editor-imagen-visita';

@Component({
  selector: 'app-campo-imagen',
  imports: [Button, EditorImagenVisita],
  templateUrl: './campo-imagen.html',
  styleUrl: './campo-imagen.css',
})
export class CampoImagen {
  @Input({ required: true }) campo!: VisitaCampo;
  @Input({ required: true }) etiqueta = '';
  @Input() ocultarEtiqueta = false;
  @Input() nombre = '';
  @Input() vistaPrevia: string | null = null;
  @Input() urlGuardada: string | null = null;
  @Input() noDisponible = false;
  /** Modo observación: se ve la imagen guardada pero no se puede cambiar. */
  @Input() bloqueado = false;
  /** Imagen cargada en el editor; mientras no sea null el editor reemplaza la vista previa. */
  @Input() imagenEdicion: Blob | null = null;
  /** Se está preparando la edición (descargando la imagen guardada). */
  @Input() preparandoEdicion = false;

  readonly accept = IMAGEN_ACCEPT;

  get editable(): boolean {
    return !this.campo.soloLectura && !this.bloqueado;
  }

  get editando(): boolean {
    return this.imagenEdicion !== null;
  }

  /** Hay una imagen visible que se puede editar: recién seleccionada o guardada y disponible. */
  get puedeEditar(): boolean {
    return this.editable && !this.editando && (!!this.vistaPrevia || (!!this.urlGuardada && !this.noDisponible));
  }

  @Output() archivoChange = new EventEmitter<Event>();
  @Output() quitar = new EventEmitter<void>();
  @Output() noDisponibleChange = new EventEmitter<void>();
  @Output() blurred = new EventEmitter<void>();
  @Output() editar = new EventEmitter<void>();
  @Output() edicionGuardada = new EventEmitter<File>();
  @Output() edicionCancelada = new EventEmitter<void>();
}
