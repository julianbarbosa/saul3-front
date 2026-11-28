import { Component, Input, SecurityContext, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { FormViewerField } from './form-viewer-field';
import {
  clampColMd,
  formatFormViewerFieldValue,
  parseFormViewerFields,
  rawHtmlForFormViewerField,
} from './form-viewer-format';

@Component({
  selector: 'app-form-viewer',
  standalone: true,
  imports: [],
  templateUrl: './form-viewer.html',
  styleUrl: './form-viewer.css',
})
export class FormViewer {
  private readonly sanitizer = inject(DomSanitizer);

  @Input() fields: FormViewerField[] = [];

  @Input() ariaLabel = 'Datos del formulario';

  /** Alternativa: arreglo o cadena JSON con la misma estructura que `fields`. */
  @Input()
  set fieldsJson(value: FormViewerField[] | string | null | undefined) {
    if (value == null) {
      return;
    }
    if (typeof value === 'string') {
      try {
        this.fields = parseFormViewerFields(value);
      } catch {
        this.fields = [];
      }
      return;
    }
    this.fields = value;
  }

  colMd(field: FormViewerField): number {
    return clampColMd(field.colMd);
  }

  displayValue(field: FormViewerField): string {
    return formatFormViewerFieldValue(field);
  }

  safeHtml(field: FormViewerField): SafeHtml {
    const raw = rawHtmlForFormViewerField(field);
    const cleaned =
      this.sanitizer.sanitize(SecurityContext.HTML, raw ?? '') ?? (raw ?? '');
    return this.sanitizer.bypassSecurityTrustHtml(cleaned);
  }
}