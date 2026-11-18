import { Pipe, PipeTransform } from '@angular/core';

import { formatearTitulo } from '../utils/formatear-titulo';

@Pipe({ name: 'titulo' })
export class TituloPipe implements PipeTransform {
  transform(texto: string | null | undefined): string {
    return formatearTitulo(texto);
  }
}
