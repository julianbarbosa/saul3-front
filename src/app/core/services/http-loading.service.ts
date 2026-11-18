import { Injectable, computed, signal } from '@angular/core';

/** Contador de peticiones HTTP en curso (overlay global). */
@Injectable({ providedIn: 'root' })
export class HttpLoadingService {
  private readonly pending = signal(0);

  readonly visible = computed(() => this.pending() > 0);

  begin(): void {
    this.pending.update((n) => n + 1);
  }

  end(): void {
    this.pending.update((n) => Math.max(0, n - 1));
  }
}
