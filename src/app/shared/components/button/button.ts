import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-button',
  imports: [],
  templateUrl: './button.html',
})
export class Button {
  @Input({ required: true }) label = '';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled = false;
  /** Guía de estilos: por defecto el botón va con borde y se rellena al pasar el mouse. */
  @Input() relleno = false;
  @Input() variante: 'primario' | 'exito' | 'peligro' = 'primario';
  /** «Middle button»: ocupa todo el ancho disponible. */
  @Input() bloque = false;

  @Output() clicked = new EventEmitter<void>();

  onClick(): void {
    if (!this.disabled) {
      this.clicked.emit();
    }
  }
}
