import { Component, Input } from '@angular/core';

/**
 * Título de página (h1) con ícono Bootstrap opcional y descripción.
 * No confundir con el header de layout en `core/header` (barra GovCo).
 */
@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class PageHeader {
  /** Texto del título (h1). Opcional si se usa solo `subtitulo` como encabezado de sección. */
  @Input() titulo: string | null = null;

  /** Línea secundaria bajo el título (p. ej. nombre del módulo o acción). */
  @Input() subtitulo: string | null = null;

  /** Clase Bootstrap Icons sin el prefijo `bi` (p. ej. `collection` → `bi bi-collection`). */
  @Input() icono: string | null = null;

  /** Párrafo de apoyo bajo el título / subtítulo. */
  @Input() descripcion: string | null = null;

  /** `id` del h1 (p. ej. para `aria-labelledby` del contenedor). */
  @Input() tituloId: string | null = null;
}
