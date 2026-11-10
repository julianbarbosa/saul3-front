import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpLoadingService } from '../../services/http-loading.service';

@Component({
  selector: 'app-http-loading-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (httpLoading.visible()) {
      <div
        class="http-loading-overlay"
        role="alert"
        aria-live="polite"
        aria-busy="true">
          <div class="spinner-border text-primary" role="status" aria-hidden="true"></div>
      </div>
    }
  `,
  styles: [
    `
      .http-loading-overlay {
        position: fixed;
        inset: 0;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.75);
        cursor: wait;
        pointer-events: all;
      }

      .http-loading-panel {
        text-align: center;
        padding: 1.5rem 2rem;
        background: #fff;
        border-radius: 12px;
        border: 1px solid #e8edf5;
        max-width: min(90vw, 320px);
      }
    `,
  ],
})
export class HttpLoadingOverlayComponent {
  protected readonly httpLoading = inject(HttpLoadingService);
}
