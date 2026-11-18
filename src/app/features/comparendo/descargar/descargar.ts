import {
  Component,
  ElementRef,
  Injector,
  OnDestroy,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import { Canvas, Circle, FabricImage, Group, IText, Line, Rect, Triangle } from 'fabric';
import { Button } from '../../../shared/components/button/button';
import { InputText } from '../../../shared/components/input-text/input-text';
import { Select } from '../../../shared/components/select/select';

const CANVAS_ANCHO = 600;
const CANVAS_ALTO = 420;

@Component({
  selector: 'app-descargar',
  imports: [Select, InputText, Button],
  templateUrl: './descargar.html',
  styleUrl: './descargar.css',
})
export class Descargar implements OnDestroy {
  private readonly injector = inject(Injector);
  private readonly fabricCanvasRef = viewChild<ElementRef<HTMLCanvasElement>>('fabricCanvas');

  imagenOrigenUrl: string | null = null;
  imagenEditadaUrl: string | null = null;
  editorActivo = false;

  private fabricCanvas: Canvas | null = null;
  private imagenCapa: FabricImage | null = null;
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

    this.destruirCanvas();
    this.revokeObjectUrls();
    this.imagenEditadaUrl = null;
    this.editorActivo = false;

    const url = URL.createObjectURL(file);
    this.objectUrls.push(url);
    this.imagenOrigenUrl = url;
    input.value = '';

    this.editorActivo = true;
    afterNextRender(() => void this.iniciarCanvas(url), { injector: this.injector });
  }

  agregarTexto(): void {
    this.agregarAlCanvas(
      new IText('Escriba aquí', {
        left: 40,
        top: 40,
        fill: '#004884',
        fontFamily: 'Roboto, Arial, sans-serif',
        fontSize: 22,
      }),
    );
  }

  agregarCuadro(): void {
    this.agregarAlCanvas(
      new Rect({
        width: 140,
        height: 90,
        fill: 'rgba(0, 72, 132, 0.08)',
        stroke: '#004884',
        strokeWidth: 2,
        left: 120,
        top: 100,
      }),
    );
  }

  agregarCirculo(): void {
    this.agregarAlCanvas(
      new Circle({
        radius: 55,
        fill: 'rgba(0, 72, 132, 0.08)',
        stroke: '#004884',
        strokeWidth: 2,
        left: 150,
        top: 120,
      }),
    );
  }

  agregarLinea(): void {
    this.agregarAlCanvas(
      new Line([80, 280, 320, 120], {
        stroke: '#004884',
        strokeWidth: 3,
        strokeLineCap: 'round',
      }),
    );
  }

  agregarFlecha(): void {
    if (!this.fabricCanvas) {
      return;
    }
    const x1 = 90;
    const y1 = 300;
    const x2 = 310;
    const y2 = 130;
    const color = '#c41e3a';
    const linea = new Line([x1, y1, x2, y2], {
      stroke: color,
      strokeWidth: 3,
      strokeLineCap: 'round',
    });
    const angulo = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
    const punta = new Triangle({
      width: 16,
      height: 20,
      fill: color,
      left: x2,
      top: y2,
      angle: angulo + 90,
      originX: 'center',
      originY: 'center',
    });
    const flecha = new Group([linea, punta]);
    flecha.set({ left: 0, top: 0 });
    this.agregarAlCanvas(flecha);
  }

  rotarImagen(): void {
    const objetivo = this.imagenCapa ?? this.fabricCanvas?.getActiveObject();
    if (!objetivo || !this.fabricCanvas) {
      return;
    }
    objetivo.rotate((objetivo.angle ?? 0) + 90);
    this.fabricCanvas.requestRenderAll();
  }

  eliminarSeleccion(): void {
    if (!this.fabricCanvas) {
      return;
    }
    const activo = this.fabricCanvas.getActiveObject();
    if (!activo || activo === this.imagenCapa) {
      return;
    }
    this.fabricCanvas.remove(activo);
    this.fabricCanvas.discardActiveObject();
    this.fabricCanvas.requestRenderAll();
  }

  guardarEdicion(): void {
    if (!this.fabricCanvas) {
      return;
    }
    this.imagenEditadaUrl = this.fabricCanvas.toDataURL({
      format: 'jpeg',
      quality: 0.92,
      multiplier: 1,
    });
  }

  descargarImagenEditada(): void {
    const dataUrl = this.imagenEditadaUrl ?? this.exportarCanvas();
    if (!dataUrl) {
      return;
    }
    const enlace = document.createElement('a');
    enlace.href = dataUrl;
    enlace.download = `comparendo-imagen-${Date.now()}.jpeg`;
    enlace.click();
  }

  cerrarEditor(): void {
    this.destruirCanvas();
    this.editorActivo = false;
  }

  limpiarImagen(): void {
    this.cerrarEditor();
    this.revokeObjectUrls();
    this.imagenOrigenUrl = null;
    this.imagenEditadaUrl = null;
  }

  ngOnDestroy(): void {
    this.destruirCanvas();
    this.revokeObjectUrls();
  }

  private async iniciarCanvas(imageUrl: string): Promise<void> {
    const el = this.fabricCanvasRef()?.nativeElement;
    if (!el || !this.editorActivo) {
      return;
    }

    this.destruirCanvas();

    this.fabricCanvas = new Canvas(el, {
      width: CANVAS_ANCHO,
      height: CANVAS_ALTO,
      backgroundColor: '#f8f9fa',
    });

    try {
      const imagen = await FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' });
      this.imagenCapa = imagen;
      imagen.set({
        selectable: true,
        hasControls: true,
        lockScalingFlip: true,
      });

      const escala = Math.min(
        CANVAS_ANCHO / (imagen.width ?? CANVAS_ANCHO),
        CANVAS_ALTO / (imagen.height ?? CANVAS_ALTO),
        1,
      );
      imagen.scale(escala);
      this.fabricCanvas.add(imagen);
      this.fabricCanvas.centerObject(imagen);
      this.fabricCanvas.requestRenderAll();
    } catch {
      this.cerrarEditor();
    }
  }

  private agregarAlCanvas(objeto: Rect | Circle | Line | IText | Group): void {
    if (!this.fabricCanvas) {
      return;
    }
    this.fabricCanvas.add(objeto);
    this.fabricCanvas.setActiveObject(objeto);
    this.fabricCanvas.requestRenderAll();
  }

  private exportarCanvas(): string | null {
    return this.fabricCanvas?.toDataURL({ format: 'jpeg', quality: 0.92, multiplier: 1 }) ?? null;
  }

  private destruirCanvas(): void {
    this.fabricCanvas?.dispose();
    this.fabricCanvas = null;
    this.imagenCapa = null;
  }

  private revokeObjectUrls(): void {
    for (const url of this.objectUrls) {
      URL.revokeObjectURL(url);
    }
    this.objectUrls = [];
  }
}