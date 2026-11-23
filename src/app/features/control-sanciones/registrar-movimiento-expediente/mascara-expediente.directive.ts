import { AfterViewInit, Directive, ElementRef, HostListener, Injector, inject } from '@angular/core';
import { NgControl } from '@angular/forms';

/** Prefijo fijo. El 6 forma parte del inicio y no se vuelve a escribir. */
export const PREFIJO_EXPEDIENTE = '76-001-6-';

const MAX_DIGITOS_CUERPO = 14;

/**
 * Quita un inicio `76-001-6-` repetido (típico al pegar el número completo
 * sobre el prefijo que ya muestra el campo).
 */
export function quitarPrefijoExpedientePegado(valor: string): string {
  let texto = (valor ?? '').trim();
  while (texto.startsWith(PREFIJO_EXPEDIENTE)) {
    texto = texto.slice(PREFIJO_EXPEDIENTE.length);
  }
  return texto;
}

/**
 * Formato `76-001-6-2026-212456`: prefijo fijo, año y consecutivo.
 * El consecutivo admite longitud variable.
 */
export function formatearNumeroExpediente(valor: string): string {
  const digitos = quitarPrefijoExpedientePegado(valor).replace(/\D/g, '').slice(0, MAX_DIGITOS_CUERPO);

  if (digitos.length === 0) {
    return PREFIJO_EXPEDIENTE;
  }

  if (digitos.length <= 4) {
    return PREFIJO_EXPEDIENTE + digitos;
  }

  return PREFIJO_EXPEDIENTE + digitos.slice(0, 4) + '-' + digitos.slice(4);
}

function posicionTrasDigitos(formateado: string, digitosDeseados: number): number {
  if (digitosDeseados <= 0) {
    return PREFIJO_EXPEDIENTE.length;
  }
  let vistos = 0;
  for (let i = 0; i < formateado.length; i++) {
    if (/\d/.test(formateado[i])) {
      vistos++;
      if (vistos === digitosDeseados) {
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
    const digitosAntes =
      cursorOrigen == null
        ? Number.POSITIVE_INFINITY
        : valor.slice(0, cursorOrigen).replace(/\D/g, '').length;

    const control = this.ngControl?.control;
    if (control && control.value !== formateado) {
      control.setValue(formateado);
    }
    if (input.value !== formateado) {
      input.value = formateado;
    }

    const pos =
      cursorOrigen == null
        ? formateado.length
        : Math.max(PREFIJO_EXPEDIENTE.length, posicionTrasDigitos(formateado, digitosAntes));
    input.setSelectionRange(pos, pos);
  }
}
