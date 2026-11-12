import { Component, EventEmitter, Input, Output } from '@angular/core';

export type SelectOption = string | { value: string; label: string };

@Component({
  selector: 'app-select',
  imports: [],
  templateUrl: './select.html',
  styleUrl: './select.css',
})
export class Select {
  @Input({ required: true }) label = '';
  @Input() id = 'select';
  @Input() options: SelectOption[] = [];
  @Input() value = '';
  @Input() readOnly = false;
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
    this.valueChange.emit((event.target as HTMLSelectElement).value);
  }
}
