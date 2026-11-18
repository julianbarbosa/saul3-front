import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Footer } from '../../../core/footer/footer';
import { Header } from '../../../core/header/header';
import { Menu } from '../../../core/menu/menu';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, Header, Menu, Footer],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout {
  /** Solo aplica en pantallas pequeñas (< 1080px): el menú lateral se abre con un botón. */
  readonly menuAbierto = signal(false);

  constructor() {
    // Al elegir una opción del menú en el celular, se cierra para mostrar la pantalla.
    inject(Router)
      .events.pipe(
        filter((evento) => evento instanceof NavigationEnd),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe(() => this.menuAbierto.set(false));
  }

  alternarMenu(): void {
    this.menuAbierto.update((abierto) => !abierto);
  }
}
