import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

interface AccesoRapido {
  titulo: string;
  descripcion: string;
  ruta: string;
}

@Component({
  selector: 'app-main',
  imports: [RouterLink],
  templateUrl: './main.html',
  styleUrl: './main.css',
})
export class Main {
  private readonly auth = inject(AuthService);

  readonly accesos: AccesoRapido[] = [
    {
      titulo: 'Gestión Acceso Justicia',
      descripcion: 'Comparendos Ley 1801, medidas correctivas y pedagogía.',
      ruta: '/gestion-acceso-justicia/comparendo/descargar',
    },
    {
      titulo: 'Consultar comparendos',
      descripcion: 'Búsqueda y consulta de comparendos registrados.',
      ruta: '/gestion-acceso-justicia/comparendo/consultar',
    },
    {
      titulo: 'Visita',
      descripcion: 'Gestión del módulo de visitas.',
      ruta: '/visita',
    },
  ];

  nombreUsuario(): string {
    const usuario = this.auth.obtenerUsuario();
    if (!usuario) {
      return 'Usuario';
    }
    return usuario.nombre?.trim() || usuario.username?.trim() || 'Usuario';
  }
}
