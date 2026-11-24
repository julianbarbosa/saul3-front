import { AfterViewInit, Directive, ElementRef, HostListener, Injector, inject } from '@angular/core';
import { NgControl } from '@angular/forms';
import {
  esDigitoFamiliaExpedientePermitido,
  formatearNumeroExpediente,
  PREFIJO_EXPEDIENTE,
  quitarPrefijoExpedientePegado,
} from '../utils/numero-expediente-formato.util';

export {
  EJEMPLO_NUMERO_EXPEDIENTE,
  EJEMPLO_NUMERO_EXPEDIENTE_CORTO,
  EJEMPLO_NUMERO_EXPEDIENTE_LARGO,
  formatearNumeroExpediente,
  PREFIJO_EXPEDIENTE,
  quitarPrefijoExpedientePegado,
} from '../utils/numero-expediente-formato.util';

function digitosTrasPrefijo(valor: string): string {
  return quitarPrefijoExpedientePegado(valor).replace(/\D/g, '');
}

function posicionTrasDigitosCuerpo(formateado: string, digitosCuerpoDeseados: number): number {
  if (digitosCuerpoDeseados <= 0) {
    return PREFIJO_EXPEDIENTE.length;
  }
  const prefijoDigitos = PREFIJO_EXPEDIENTE.replace(/\D/g, '').length;
  let vistosCuerpo = 0;
  let vistosTotal = 0;
  for (let i = 0; i < formateado.length; i++) {
    if (!/\d/.test(formateado[i])) {
      continue;
    }
    vistosTotal++;
    if (vistosTotal > prefijoDigitos) {
      vistosCuerpo++;
      if (vistosCuerpo === digitosCuerpoDeseados) {
        return i + 1;
      }
    }
  }
  return formateado.length;
}

@Directive({
  selector: 'input[appMascaraExpediente]',
  standalone: true,
})
export class MascaraExpedienteDirective implements AfterViewInit {
  private readonly el = inject(ElementRef<HTMLInputElement>);
  private readonly injector = inject(Injector);
  private ngControl: NgControl | null = null;

  ngAfterViewInit(): void {
    this.ngControl = this.injector.get(NgControl, null);
    setTimeout(() => this.aplicar(this.el.nativeElement.value, null));
  }

  @HostListener('paste', ['$event'])
  alPegar(event: ClipboardEvent): void {
    const pegado = (event.clipboardData?.getData('text') ?? '').trim();
    if (!pegado.startsWith(PREFIJO_EXPEDIENTE)) {
      return;
    }

    event.preventDefault();
    const resto = quitarPrefijoExpedientePegado(pegado);
    const input = this.el.nativeElement;
    const limite = PREFIJO_EXPEDIENTE.length;
    const start = Math.max(input.selectionStart ?? limite, limite);
    const end = Math.max(input.selectionEnd ?? start, start);
    const base = input.value.startsWith(PREFIJO_EXPEDIENTE) ? input.value : PREFIJO_EXPEDIENTE;
    const combinado = base.slice(0, start) + resto + base.slice(end);
    this.aplicar(combinado, null);
  }

  @HostListener('input')
  alEscribir(): void {
    const input = this.el.nativeElement;
    this.aplicar(input.value, input.selectionStart);
  }

  @HostListener('keydown', ['$event'])
  alPulsarTecla(event: KeyboardEvent): void {
    const input = this.el.nativeElement;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    const limite = PREFIJO_EXPEDIENTE.length;

    if (event.key === 'Home') {
      event.preventDefault();
      const destino = event.shiftKey ? end : limite;
      input.setSelectionRange(limite, Math.max(destino, limite));
      return;
    }

    if (event.key === 'Backspace' && end <= limite) {
      event.preventDefault();
      input.setSelectionRange(limite, limite);
      return;
    }

    if (event.key === 'Backspace' && start === end && input.value[start - 1] === '-') {
      event.preventDefault();
      this.aplicar(input.value.slice(0, start - 2) + input.value.slice(start), start - 2);
      return;
    }

    if (event.key === 'Delete' && start === end && input.value[start] === '-') {
      event.preventDefault();
      this.aplicar(input.value.slice(0, start) + input.value.slice(start + 2), start);
      return;
    }

    if ((event.key === 'Backspace' || event.key === 'Delete') && start < limite) {
      event.preventDefault();
      if (end > limite) {
        this.aplicar(PREFIJO_EXPEDIENTE + input.value.slice(end), limite);
      } else {
        input.setSelectionRange(limite, limite);
      }
      return;
    }

    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    if (event.key.length === 1 && !/^\d$/.test(event.key)) {
      event.preventDefault();
      return;
    }

    if (/^\d$/.test(event.key)) {
      const digitosAntesDelCursor = digitosTrasPrefijo(input.value.slice(0, Math.max(start, limite))).length;
      if (digitosAntesDelCursor === 0 && !esDigitoFamiliaExpedientePermitido(event.key)) {
        event.preventDefault();
        return;
      }
    }

    if (start < limite && /^\d$/.test(event.key)) {
      event.preventDefault();
      this.aplicar(input.value + event.key, input.value.length + 1);
    }
  }

  @HostListener('click')
  @HostListener('keyup')
  @HostListener('focus')
  ajustarCursor(): void {
    const input = this.el.nativeElement;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    const limite = PREFIJO_EXPEDIENTE.length;
    if (start < limite && end <= limite) {
      input.setSelectionRange(limite, limite);
    } else if (start < limite) {
      input.setSelectionRange(limite, end);
    }
  }

  private aplicar(valor: string, cursorOrigen: number | null): void {
    const input = this.el.nativeElement;
    const formateado = formatearNumeroExpediente(valor);
    const digitosCuerpoAntes =
      cursorOrigen == null
        ? Number.POSITIVE_INFINITY
        : digitosTrasPrefijo(valor.slice(0, cursorOrigen)).length;

    const control = this.ngControl?.control;
    if (control && control.value !== formateado) {
      control.setValue(formateado);
    }
    if (input.value !== formateado) {
      input.value = formateado;
    }

    let pos =
      cursorOrigen == null
        ? formateado.length
        : Math.max(PREFIJO_EXPEDIENTE.length, posicionTrasDigitosCuerpo(formateado, digitosCuerpoAntes));
    if (pos === formateado.length - 1 && formateado.endsWith('-')) {
      pos = formateado.length;
    }
    input.setSelectionRange(pos, pos);
  }
}