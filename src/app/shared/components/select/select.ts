import { Component, EventEmitter, Input, Output } from '@angular/core';

import { ValidacionCampo } from '../validacion-campo';

export type SelectOption = string | { value: string; label: string };

@Component({
  selector: 'app-select',
  imports: [],
  templateUrl: './select.html',
  styleUrls: ['../campo-formulario.css', './select.css'],
})
export class Select extends ValidacionCampo {
  @Input({ required: true }) label = '';
  @Input() override id = 'select';
  @Input() options: SelectOption[] = [];
  @Input() placeholder = 'Seleccione...';
  @Output() valueChange = new EventEmitter<string>();

  optionValue(option: SelectOption): string {
    return typeof option === 'string' ? option : option.value;
  }

  optionLabel(option: SelectOption): string {
    return typeof option === 'string' ? option : option.label;
  }

  trackOption(option: SelectOption): string {
    return this.optionValue(option);
  }

  onChange(event: Event): void {
    if (this.readOnly) {
      return;
    }
    this.registrarEntrada(event);
    this.marcarTocado();
    this.valueChange.emit((event.target as HTMLSelectElement).value);
  }

  onBlur(): void {
    this.marcarTocado();
  }
}
