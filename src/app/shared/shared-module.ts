import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectBarrio } from './components/composites/select-barrio/select-barrio';

@NgModule({
  imports: [CommonModule, FormsModule, SelectBarrio],
  exports: [CommonModule, FormsModule, SelectBarrio],
})
export class SharedModule {}
