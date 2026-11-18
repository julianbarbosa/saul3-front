import {
  Component,
  ElementRef,
  OnDestroy,
  viewChild,
} from '@angular/core';
import { Button } from '../../../shared/components/button/button';
import { InputText } from '../../../shared/components/input-text/input-text';
import { Select } from '../../../shared/components/select/select';

type FilerobotEditorInstance = {
  render: (config?: { onClose?: (reason: unknown, unsaved: boolean) => void }) => void;
  terminate: () => void;
};

@Component({
  selector: 'app-descargar',
  imports: [Select, InputText, Button],
  templateUrl: './descargar.html',
  styleUrl: './descargar.css',
})
export class Descargar implements OnDestroy {
  private readonly editorHost = viewChild<ElementRef<HTMLDivElement>>('editorHost');

  imagenOrigenUrl: string | null = null;
  imagenEditadaUrl: string | null = null;
  editorAbierto = false;
  cargandoEditor = false;

  private editorInstance: FilerobotEditorInstance | null = null;
  private objectUrls: string[] = [];

  descargar(): void {
    // TODO: integrar servicio de descarga RNMC
  }

  onImagenSeleccionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      return;
    }

    this.cerrarEditor();
    this.revokeObjectUrls();
    this.imagenEditadaUrl = null;

    const url = URL.createObjectURL(file);
    this.objectUrls.push(url);
    this.imagenOrigenUrl = url;
    input.value = '';
  }

  async abrirEditor(): Promise<void> {
    const host = this.editorHost()?.nativeElement;
    const source = this.imagenEditadaUrl ?? this.imagenOrigenUrl;
    if (!host || !source || this.cargandoEditor) {
      return;
    }

    this.cargandoEditor = true;
    try {
      this.cerrarEditor();
      this.editorAbierto = true;

      const { default: FilerobotImageEditor } = await import('filerobot-image-editor');

      this.editorInstance = new FilerobotImageEditor(host, {
        source,
        language: 'es',
        closeAfterSave: true,
        defaultSavedImageName: 'comparendo-imagen',
        defaultSavedImageType: 'jpeg',
        savingPixelRatio: 4,
        previewPixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        onSave: (savedImageData) => {
          if (savedImageData.imageBase64) {
            this.imagenEditadaUrl = savedImageData.imageBase64;
          }
        },
      }) as FilerobotEditorInstance;

      this.editorInstance.render({
        onClose: () => {
          this.cerrarEditor();
        },
      });
    } finally {
      this.cargandoEditor = false;
    }
  }

  descargarImagenEditada(): void {
    if (!this.imagenEditadaUrl) {
      return;
    }

    const enlace = document.createElement('a');
    enlace.href = this.imagenEditadaUrl;
    enlace.download = `comparendo-imagen-${Date.now()}.jpeg`;
    enlace.click();
  }

  limpiarImagen(): void {
    this.cerrarEditor();
    this.revokeObjectUrls();
    this.imagenOrigenUrl = null;
    this.imagenEditadaUrl = null;
  }

  ngOnDestroy(): void {
    this.cerrarEditor();
    this.revokeObjectUrls();
  }

  private cerrarEditor(): void {
    this.editorInstance?.terminate();
    this.editorInstance = null;
    this.editorAbierto = false;
  }

  private revokeObjectUrls(): void {
    for (const url of this.objectUrls) {
      URL.revokeObjectURL(url);
    }
    this.objectUrls = [];
  }
}