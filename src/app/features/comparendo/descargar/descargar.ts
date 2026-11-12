import { Component } from '@angular/core';
import { Button } from '../../../shared/components/button/button';
import { SelectBarrio } from '../../../shared/components/composites/select-barrio/select-barrio';
import { InputText } from '../../../shared/components/input-text/input-text';
import { Select } from '../../../shared/components/select/select';
import { SelectComuna } from '../../../shared/components/composites/select-comuna/select-comuna';

@Component({
  selector: 'app-descargar',
  imports: [Select, InputText, Button, SelectBarrio, SelectComuna],
  templateUrl: './descargar.html',
  styleUrl: './descargar.css',
})
export class Descargar {
  descargar(): void {
    // TODO: integrar servicio de descarga RNMC
  }
}
