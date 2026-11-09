import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ListaComparendosComponent } from '../lista-comparendos/lista-comparendos.component';
import { FormularioHelper } from 'src/app/core/helpers/formulario.helper';
import { ComparendoService, TipoDocIdentificacionApi } from 'src/app/core/services/comparendo.service';
import { BusquedaStateService } from 'src/app/core/services/busqueda-state.service';
import { ActivatedRoute, Router } from '@angular/router';
import { marcarAccesoPublicoCodigoPolicia } from 'src/app/core/helpers/codigo-policia-route.helper';

interface TipoIdentificacionOpcion {
  id: number;
  codigo: string;
  nombre: string;
  numDigitos: number | null;
  rnmcId: number | null;
}

interface InfoCard {
  icono: string;
  colorClase: string;
  titulo: string;
  descripcion: string;
  prompt: string;
}

@Component({
  selector: 'app-main',
  imports: [CommonModule, ReactiveFormsModule, ListaComparendosComponent],
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.sass']
})
export class MainComponent implements OnInit, AfterViewInit {

  private formBuilder = inject(FormBuilder);
  public formularioHelper = inject(FormularioHelper);
  private comparendoService = inject(ComparendoService);
  private busquedaState = inject(BusquedaStateService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  busquedaRealizada = signal(false);
  /** Mientras la petición HTTP de comparendos está en curso */
  cargandoBusqueda = signal(false);
  comparendos = signal<any[]>([]);
  identificacionBusqueda = signal('');
  tiposIdentificacion = signal<TipoIdentificacionOpcion[]>([]);

  @ViewChild('identificacionInput') identificacionInput?: ElementRef<HTMLInputElement>;

  buscarForm: FormGroup = this.formBuilder.group({
    tipoIdentificacion: ['CC', [Validators.required]],
    identificacion: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9]+$/)]]
  });

  infoCards: InfoCard[] = [
    {
      icono: 'bi-file-earmark-text',
      colorClase: 'text-primary',
      titulo: 'Pagos PSE',
      descripcion: 'Pague sus multas de forma segura sin salir de casa utilizando cualquier cuenta bancaria.',
      prompt: 'PagoEnLinea'
    },
    {
      icono: 'bi-scales',
      colorClase: 'text-success',
      titulo: 'Normatividad',
      descripcion: 'El régimen sancionatorio se rige por la Ley 1801 de 2016 (Código Nacional de Seguridad y Convivencia Ciudadana) y sus modificaciones introducidas por la Ley 2197 de 2022.',
      prompt: '¿Cuáles son las leyes que rigen el Código de Policía en Colombia?'
    },

    {
      icono: 'bi-headphones',
      colorClase: 'text-info',
      titulo: 'Contacto',
      descripcion: 'Atención en CAM Avenida 2 Norte o vía email: control.sanciones@cali.gov.co',
      prompt: ''
    }
  ];

  ngOnInit(): void {
    marcarAccesoPublicoCodigoPolicia(this.router, this.route, this.busquedaState);
    this.formularioHelper.setFormulario(this.buscarForm);
    this.cargarTiposIdentificacion();
  }

  ngAfterViewInit(): void {
    this.enfocarIdentificacion();
  }

  private cargarTiposIdentificacion(): void {
    this.comparendoService.getTiposDocIdentificacionRnmc().subscribe({
      next: (response) => {
        const data: TipoDocIdentificacionApi[] = Array.isArray(response)
          ? response
          : [];

        this.tiposIdentificacion.set(
          data.map((item) => ({
            id: item.id,
            codigo: item.tipo,
            nombre: item.nombre || item.descripcion || item.tipo,
            numDigitos: item.numDigitos ?? null,
            rnmcId: item.rnmcId ?? null,
          })),
        );
      },
      error: () => {
        this.tiposIdentificacion.set([]);
      },
    });
  }

  get placeholderIdentificacion(): string {
    const codigo = this.buscarForm.get('tipoIdentificacion')?.value;
    const tipo = this.tiposIdentificacion().find(t => t.codigo === codigo);
    if (!tipo) return 'Ingrese el número de documento';
    return tipo.numDigitos
      ? `Ingrese su ${tipo.nombre} (máx. ${tipo.numDigitos} caracteres)`
      : `Ingrese su ${tipo.nombre}`;
  }

  get maxLengthIdentificacion(): number {
    const codigo = this.buscarForm.get('tipoIdentificacion')?.value;
    const tipo = this.tiposIdentificacion().find(t => t.codigo === codigo);
    return tipo?.numDigitos ?? 20;
  }

  onBuscar(): void {
    if (this.buscarForm.invalid) {
      this.buscarForm.markAllAsTouched();
      return;
    }

    this.busquedaRealizada.set(false);
    this.comparendos.set([]);

    const identificacion = this.buscarForm.get('identificacion')?.value;
    const codigoSeleccionado = this.buscarForm.get('tipoIdentificacion')?.value;
    const tipoObj = this.tiposIdentificacion().find(t => t.codigo === codigoSeleccionado);
    const tipo = tipoObj?.rnmcId?.toString() ?? codigoSeleccionado ?? undefined;
    this.identificacionBusqueda.set(identificacion);
    this.busquedaState.identificacion = identificacion;
    this.busquedaState.tipo = tipo;

    this.cargandoBusqueda.set(true);
    this.comparendoService.getComparendosPorIdentificacion(identificacion, tipo).subscribe({
      next: (response) => {
        const raw = response?.data;
        this.comparendos.set(
          Array.isArray(raw) ? raw : raw != null ? [raw] : [],
        );
        this.busquedaRealizada.set(true);
        this.cargandoBusqueda.set(false);
      },
      error: (err: unknown) => {
        console.error('Error al consultar comparendos:', err);
        this.comparendos.set([]);
        this.busquedaRealizada.set(true);
        this.cargandoBusqueda.set(false);
      },
    });
  }

  limpiar(): void {
    this.buscarForm.reset({ tipoIdentificacion: 'CC', identificacion: '' });
    this.comparendos.set([]);
    this.busquedaRealizada.set(false);
    this.cargandoBusqueda.set(false);
    this.enfocarIdentificacion();
  }

  private enfocarIdentificacion(): void {
    setTimeout(() => this.identificacionInput?.nativeElement.focus());
  }

  verMasInfo(card: InfoCard): void {
    // TODO: integrar con el servicio o módulo de consulta (chat / FAQ).
    console.log('Consultar información:', card.prompt);
  }
}
