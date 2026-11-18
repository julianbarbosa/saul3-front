import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HttpLoadingOverlayComponent } from './core/components/http-loading-overlay/http-loading-overlay.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HttpLoadingOverlayComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('gestion-front');
}
