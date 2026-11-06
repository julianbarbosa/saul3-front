import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CrearObjecionService } from 'src/app/core/services/crear-objecion.service';
import { BusquedaStateService } from 'src/app/core/services/busqueda-state.service';

@Component({
  selector: 'app-crea-objecion',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './crea-objecion.html',
  styleUrls: []
})
export class CreaObjecionComponent implements OnInit {

  private fb            = inject(FormBuilder);
  private router        = inject(Router);
  private objecionSvc   = inject(CrearObjecionService);
  private busquedaState = inject(BusquedaStateService);

  idComparendo: number | null = null;
  identificacionParam: string | null = null;
  maxDias: number | null = null;
  fechaHoy: string = new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });

  cargando: boolean = true;
  puedeObjetar: boolean = false;
  mensajeNoPuedeObjetar: string = '';
  errorAlCargar: boolean = false;

  objecionExitosa: boolean = false;
  idObjecionCreada: number | null = null;
  errorEnvio: boolean = false;
  mensajeErrorEnvio: string = '';

  archivosSeleccionados: File[] = [];

  form: FormGroup = this.fb.group({
    phoneGov:     ['', [Validators.required, Validators.pattern(/^3\d{9}$/)]],
    emailGov:     ['', [Validators.required, Validators.email]],
    addressGov:   ['', Validators.required],
    argumentsGov: ['', [Validators.required, Validators.minLength(10)]],
    termsGov:     [false, Validators.requiredTrue]
  });

  ngOnInit(): void {
    this.idComparendo        = this.busquedaState.comparendoId;
    this.identificacionParam = this.busquedaState.identificacion;

    if (this.idComparendo) {
      this.verificarValidarObjecion();
    } else {
      this.errorAlCargar = true;
      this.cargando = false;
    }
  }

  private verificarValidarObjecion(): void {
    this.objecionSvc.validarObjecion(this.idComparendo!).subscribe({
      next: (resp) => {
        const r = resp as any;
        this.puedeObjetar = r?.success === true || r?.puede === true || r?.data === true;
        if (!this.puedeObjetar) {
          this.mensajeNoPuedeObjetar = r?.msg || r?.message || 'No puede realizar una objeción en este momento.';
        }
        this.cargando = false;
      },
      error: () => {
        this.errorAlCargar = true;
        this.cargando = false;
      }
    });
  }

  openFileDialog(): void {
    (document.getElementById('fileInputGov') as HTMLInputElement)?.click();
  }

  onFilesChanged(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    const nuevos = Array.from(input.files);
    if (this.archivosSeleccionados.length + nuevos.length > 5) {
      alert('Máximo 5 archivos permitidos.');
      input.value = '';
      return;
    }
    for (const file of nuevos) {
      if (file.size > 5 * 1024 * 1024) { alert(`${file.name} excede 5 MB.`); continue; }
      if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) { alert(`Formato no soportado: ${file.name}`); continue; }
      this.archivosSeleccionados.push(file);
    }
    input.value = '';
  }

  eliminarArchivo(file: File): void {
    this.archivosSeleccionados = this.archivosSeleccionados.filter(f => f !== file);
  }

  submitObjection(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.errorEnvio = false;
    this.objecionSvc.guardarObjecion({
      idComparendo:      this.idComparendo!,
      argumentos:        this.form.value.argumentsGov.trim(),
      telefono:          this.form.value.phoneGov,
      email:             this.form.value.emailGov.trim(),
      direccionnotifica: this.form.value.addressGov.trim(),
    }, this.archivosSeleccionados).subscribe({
      next: (resp) => {
        const r = resp as any;
        if (r?.success === false) {
          this.errorEnvio = true;
          this.mensajeErrorEnvio = r?.msg || 'No se pudo registrar la objeción.';
          return;
        }
        this.idObjecionCreada = r?.idObjecion ?? r?.data?.id ?? r?.id ?? null;
        this.objecionExitosa = true;
      },
      error: (err) => {
        this.errorEnvio = true;
        this.mensajeErrorEnvio = err?.error?.msg || err?.error?.message || `Error ${err?.status ?? ''}`;
      }
    });
  }

  descargarCertificado(): void {
    if (!this.idObjecionCreada) return;
    this.objecionSvc.descargarCertificado(this.idObjecionCreada).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificado-objecion-${this.idObjecionCreada}.pdf`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
      error: (err) => {
        console.error('Error al descargar certificado', err);
      }
    });
  }

  volver(): void {
    this.router.navigate(['/gestion-acceso-justicia/comparendo/gestion-ciudadano/detalle-comparendo']);
  }

  finalizarYVolver(): void {
    this.router.navigate(['/gestion-acceso-justicia/comparendo/gestion-ciudadano/lista-comparendos']);
  }
}
