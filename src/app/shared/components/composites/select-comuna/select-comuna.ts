import { Component, inject, Input, signal } from '@angular/core';
import { CatastroService } from 'src/app/core/services/catastro.service';
import { Select, SelectOption } from '../../select/select';

@Component({
  selector: 'app-select-comuna',
  imports: [Select],
  templateUrl: './select-comuna.html',
  styleUrl: './select-comuna.css',
})
export class SelectComuna {
  private readonly catastro = inject(CatastroService);

  @Input() label = 'Comuna';
  @Input() placeholder = 'Seleccione una comuna';  
  @Input() value = '';

  comunas = signal<SelectOption[]>([]);

  ngOnInit(): void {
    this.catastro.getComunas().subscribe((lista) => {
      this.comunas.set(
        lista.map((c:any) => ({
          value: String(c.idcomuna),
          label: c.codigo,
        })),
      );
    });
  }
}
