import { Directive, Input } from '@angular/core';

export const MENSAJE_CAMPO_REQUERIDO = 'Campo requerido*';

/**
 * Estado de validación común a app-input, app-select y app-textarea (KIT UI SAUL3):
 * Error = obligatorio vacío; Success = obligatorio diligenciado.
 * Solo se muestra después de que el usuario sale del campo o cuando el contenedor
 * lo fuerza con `validar` (p. ej. al pulsar «Continuar»). Los campos de solo lectura no se validan.
 */
@Directive()
export abstract class ValidacionCampo {
  @Input() id = 'campo';
  @Input() readOnly = false;
  @Input() required = false;
  /** Fuerza a mostrar el estado de validación aunque el usuario no haya tocado el campo. */
  @Input() validar = false;
  @Input() mensajeError = MENSAJE_CAMPO_REQUERIDO;

  @Input()
  set value(valor: string | null | undefined) {
    this.valorActual = valor ?? '';
  }
  get value(): string {
    return this.valorActual;
  }

  protected valorActual = '';
  protected tocado = false;

  get vacio(): boolean {
    return this.valorActual.trim().length === 0;
  }

  get enError(): boolean {
    return this.mostrarValidacion && this.vacio;
  }

  get enExito(): boolean {
    return this.mostrarValidacion && !this.vacio;
  }

  get idError(): string {
    return `${this.id}-error`;
  }

  private get mostrarValidacion(): boolean {
    return this.required && !this.readOnly && (this.tocado || this.validar);
  }

  /** Lo que el usuario escribe, para que el estado cambie mientras escribe. */
  protected registrarEntrada(event: Event): void {
    if (this.readOnly) {
      return;
    }
    this.valorActual = (
      event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    ).value;
  }

  protected marcarTocado(): void {
    this.tocado = true;
  }
}
