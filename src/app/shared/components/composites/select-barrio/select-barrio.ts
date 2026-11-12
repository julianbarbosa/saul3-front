import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CatastroService } from '../../../../core/services/catastro.service';
import { Select, SelectOption } from '../../select/select';

@Component({
  selector: 'app-select-barrio',
  imports: [Select],
  templateUrl: './select-barrio.html',
  styleUrl: './select-barrio.css',
})
export class SelectBarrio implements OnInit {
  private readonly catastro = inject(CatastroService);

  @Input() label = 'Barrio';
  @Input() placeholder = 'Seleccione un barrio';
  /** idbarrio seleccionado (string). */
  @Input() value = '';

  barrios = signal<SelectOption[]>([]);

  ngOnInit(): void {
    this.catastro.getBarrios().subscribe((lista) => {
      this.barrios.set(
        lista.map((b) => ({
          value: String(b.idbarrio),
          label: b.nombre,
        })),
      );
    });
  }
}
