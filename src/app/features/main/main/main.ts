import { Component, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-main',
  standalone: true,
  templateUrl: './main.html',
  styleUrl: './main.css',
})
export class Main {
  private readonly auth = inject(AuthService);

  nombreUsuario(): string {
    const usuario = this.auth.obtenerUsuario();
    if (!usuario) {
      return 'Usuario';
    }
    return usuario.nombre?.trim() || usuario.username?.trim() || 'Usuario';
  }
}
