import { Component, inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { BarraGovCo } from './barra-gov-co/barra-gov-co';
import { BloqueLogo } from './bloque-logo/bloque-logo';

@Component({
  selector: 'app-header',
  imports: [BarraGovCo, BloqueLogo],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  private readonly auth = inject(AuthService);

  logout(): void {
    this.auth.cerrarSesion();
  }
}
