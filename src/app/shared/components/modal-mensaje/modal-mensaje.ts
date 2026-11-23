import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

/** Popup reutilizable para mensajes de operación (éxito, error o informativo). */
@Component({
  selector: 'app-modal-mensaje',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal-mensaje.html',
  styleUrl: './modal-mensaje.css',
})
export class ModalMensajeComponent {
  @Input() visible = false;
  @Input() titulo = 'Mensaje';
  @Input() mensaje = '';
  @Input() variante: 'info' | 'exito' | 'error' = 'info';

  @Output() cerrar = new EventEmitter<void>();

  claseEncabezado(): string {
    switch (this.variante) {
      case 'exito':
        return 'text-bg-success';
      case 'error':
        return 'text-bg-danger';
      default:
        return 'text-bg-primary';
    }
  }

  solicitarCierre(): void {
    this.cerrar.emit();
  }
}