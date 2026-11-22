import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Header } from '../../../core/header/header';
import { Footer } from '../../../core/footer/footer';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [Header, Footer, RouterLink],
  template: `
    <app-header></app-header>
    <main class="container py-5">
      <h1 class="h3">Acceso no permitido (403)</h1>
      <p class="text-muted">
        No tiene permisos para ver esta sección. Si cree que es un error, cierre sesión y vuelva a
        ingresar o contacte al administrador.
      </p>
      <a routerLink="/main" class="btn btn-primary">Ir al inicio</a>
    </main>
    <app-footer></app-footer>
  `,
})
export class Forbidden {}