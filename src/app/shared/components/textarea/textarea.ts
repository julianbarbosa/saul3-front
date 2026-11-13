import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';

import { ValidacionCampo } from '../validacion-campo';

/** Alto máximo del cuadro; a partir de ahí hace scroll. Debe coincidir con `max-height` del CSS. */
const ALTO_MAXIMO = 320;

@Component({
  selector: 'app-textarea',
  imports: [],
  templateUrl: './textarea.html',
  styleUrls: ['../campo-formulario.css', './textarea.css'],
})
export class Textarea extends ValidacionCampo implements AfterViewInit, OnChanges {
  @Input({ required: true }) label = '';
  @Input() override id = 'textarea';
  @Input() placeholder = '';
  /** Oculta la etiqueta visual. El vínculo con el control se conserva. */
  @Input() ocultarEtiqueta = false;
  @Output() valueChange = new EventEmitter<string>();
  @Output() blurred = new EventEmitter<void>();

  @ViewChild('cuadro') private cuadro?: ElementRef<HTMLTextAreaElement>;

  ngAfterViewInit(): void {
    this.ajustarAlto();
  }

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['value'] && this.cuadro) {
      this.cuadro.nativeElement.value = this.value ?? '';
      this.ajustarAlto();
    }
  }

  ajustarAlto(): void {
    const elemento = this.cuadro?.nativeElement;
    if (!elemento) {
      return;
    }
    elemento.style.height = 'auto';
    const alto = elemento.scrollHeight;
    elemento.style.height = `${Math.min(alto, ALTO_MAXIMO)}px`;
    elemento.style.overflowY = alto > ALTO_MAXIMO ? 'auto' : 'hidden';
  }

  onInput(event: Event): void {
    this.registrarEntrada(event);
    this.ajustarAlto();
  }

  onBlur(event: Event): void {
    this.marcarTocado();
    if (this.readOnly) {
      return;
    }
    this.valueChange.emit((event.target as HTMLTextAreaElement).value);
    this.blurred.emit();
  }
}
