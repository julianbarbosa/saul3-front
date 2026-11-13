import { Component, EventEmitter, Input, Output } from '@angular/core';

import { ValidacionCampo } from '../validacion-campo';

export { MENSAJE_CAMPO_REQUERIDO } from '../validacion-campo';

@Component({
  selector: 'app-input-text, app-input',
  imports: [],
  templateUrl: './input-text.html',
  styleUrls: ['../campo-formulario.css', './input-text.css'],
})
export class InputText extends ValidacionCampo {
  @Input({ required: true }) label = '';
  @Input() override id = 'input-text';
  @Input() placeholder = '';
  /** Oculta la etiqueta visual. El vínculo con el control se conserva. */
  @Input() ocultarEtiqueta = false;
  /** Tipo nativo del input: fecha, hora y número usan el control del navegador, como en SAUL. */
  @Input() type: 'text' | 'date' | 'time' | 'number' = 'text';
  /** Solo para `type="number"` (SAUL usa 0.01). */
  @Input() step: string | null = null;
  @Output() valueChange = new EventEmitter<string>();
  @Output() blurred = new EventEmitter<void>();
  /** Evento `change` nativo: en `type="time"` es cuando SAUL guarda (ng-change). */
  @Output() changed = new EventEmitter<string>();

  onInput(event: Event): void {
    this.registrarEntrada(event);
  }

  onBlur(event: Event): void {
    this.marcarTocado();
    if (this.readOnly) {
      return;
    }
    this.valueChange.emit((event.target as HTMLInputElement).value);
    this.blurred.emit();
  }

  onChange(event: Event): void {
    if (this.readOnly) {
      return;
    }
    this.registrarEntrada(event);
    this.changed.emit((event.target as HTMLInputElement).value);
  }
}
