import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Injectable({ providedIn: 'root' })
export class FormularioHelper {
  private formulario?: FormGroup;

  setFormulario(formulario: FormGroup): void {
    this.formulario = formulario;
  }

  campoInvalido(nombreCampo: string): boolean {
    const control = this.formulario?.get(nombreCampo);
    return !!control && control.touched && control.invalid;
  }
}
