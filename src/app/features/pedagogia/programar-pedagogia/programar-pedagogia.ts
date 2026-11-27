import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ResponseI } from '../../../core/interfaces/response.interface';
import {
  CapacitadorPedagogia,
  CatalogoPedagogia,
  CrearProgramacionPedagogiaPayload,
  FechaPedagogia,
  PedagogiaService,
} from '../../../core/services/pedagogia.service';

type Registro = Record<string, unknown>;

@Component({
  selector: 'app-programar-pedagogia',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './programar-pedagogia.html',
})
export class ProgramarPedagogia implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly pedagogiaService = inject(PedagogiaService);

  readonly formulario = this.formBuilder.group({
    duracion: this.formBuilder.nonNullable.control('', Validators.required),
    fecha: this.formBuilder.nonNullable.control('', Validators.required),
    hora: this.formBuilder.nonNullable.control('', Validators.required),
    pedagogiaId: this.formBuilder.nonNullable.control('', Validators.required),
    cupo: this.formBuilder.control<number | null>(null, [
      Validators.required,
      Validators.min(0),
      Validators.max(100),
    ]),
    capacitadorId: this.formBuilder.nonNullable.control('', Validators.required),
    modalidad: this.formBuilder.nonNullable.control('', Validators.required),
    lugar: this.formBuilder.nonNullable.control('', Validators.required),
    observaciones: this.formBuilder.nonNullable.control(''),
  });

  readonly duraciones = [20, 40, 60, 80, 100];
  readonly capacitadores = signal<CapacitadorPedagogia[]>([]);
  readonly pedagogias = signal<CatalogoPedagogia[]>([]);
  readonly fechas = signal<FechaPedagogia[]>([]);
  readonly horasDisponibles = signal<string[]>([]);
  readonly cargandoInicial = signal(false);
  readonly guardando = signal(false);
  readonly formularioEnviado = signal(false);
  readonly errorInicial = signal('');
  readonly resultado = signal<{ tipo: 'exito' | 'error'; mensaje: string } | null>(null);

  ngOnInit(): void {
    this.cargarDatosIniciales();
  }

  consultarHorarios(): void {
    const duracion = Number(this.formulario.controls.duracion.value);
    const fecha = this.formulario.controls.fecha.value;
    this.formulario.controls.hora.setValue('');
    this.horasDisponibles.set([]);

    if (!fecha || !this.duraciones.includes(duracion)) {
      return;
    }

    const ultimaHoraInicio = 20 * 60 - duracion;
    const horas: string[] = [];
    for (let minuto = 8 * 60; minuto <= ultimaHoraInicio; minuto += 10) {
      const horasDelDia = Math.floor(minuto / 60)
        .toString()
        .padStart(2, '0');
      const minutos = (minuto % 60).toString().padStart(2, '0');
      horas.push(`${horasDelDia}:${minutos}`);
    }
    this.horasDisponibles.set(horas);
  }

  actualizarLugar(): void {
    const modalidad = this.formulario.controls.modalidad.value;
    if (modalidad !== 'presencial') {
      this.formulario.controls.lugar.setValue('');
      return;
    }

    const capacitador = this.capacitadores().find(
      (item) => String(item.id) === this.formulario.controls.capacitadorId.value,
    );
    this.formulario.controls.lugar.setValue(capacitador?.direccion ?? '');
  }

  guardar(): void {
    this.formularioEnviado.set(true);
    this.resultado.set(null);
    if (this.formulario.invalid || this.guardando()) {
      this.formulario.markAllAsTouched();
      return;
    }

    const valores = this.formulario.getRawValue();
    const duracion = Number(valores.duracion);
    const cupo = valores.cupo;
    const pedagogia = this.pedagogias().find(
      (item) => String(item.id) === valores.pedagogiaId,
    );
    const responsable = this.capacitadores().find(
      (item) => String(item.id) === valores.capacitadorId,
    );
    const fechaInicial = this.fechaHoraLocal(valores.fecha, valores.hora);

    if (
      !pedagogia ||
      !responsable ||
      cupo === null ||
      !this.duraciones.includes(duracion) ||
      !fechaInicial
    ) {
      this.resultado.set({
        tipo: 'error',
        mensaje: 'Revise los datos de pedagogía, capacitador, fecha, hora y cupo.',
      });
      return;
    }

    const fechaFinal = new Date(fechaInicial.getTime() + duracion * 60_000);
    const payload: CrearProgramacionPedagogiaPayload = {
      duracion,
      fechaCita: { fecha: valores.fecha },
      horaCita: { hora: fechaInicial },
      pedagogia,
      cupo,
      responsable,
      modalidad: valores.modalidad as 'presencial' | 'virtual',
      lugar: valores.lugar.trim(),
      observaciones: valores.observaciones.trim(),
      fechaInicialISO: fechaInicial.toISOString(),
      fechaFinalISO: fechaFinal.toISOString(),
    };

    this.guardando.set(true);
    this.pedagogiaService.guardarProgramacionPedagogia(payload).subscribe({
      next: (respuesta) => {
        this.guardando.set(false);
        if (respuesta.success === false) {
          this.resultado.set({
            tipo: 'error',
            mensaje: respuesta.msg ?? respuesta.message ?? 'No se pudo crear la programación.',
          });
          return;
        }
        this.resultado.set({
          tipo: 'exito',
          mensaje: respuesta.msg ?? respuesta.message ?? 'Programación creada correctamente.',
        });
        this.formulario.markAsPristine();
        this.formulario.markAsUntouched();
        this.formularioEnviado.set(false);
      },
      error: (error: unknown) => {
        this.guardando.set(false);
        const httpError = error instanceof HttpErrorResponse ? error : null;
        const cuerpo = this.aRegistro(httpError?.error);
        this.resultado.set({
          tipo: 'error',
          mensaje:
            this.textoError(cuerpo?.['message']) ??
            this.textoError(cuerpo?.['msg']) ??
            'No fue posible crear la programación. Intente nuevamente.',
        });
        console.error('Error al crear programación de pedagogía:', error);
      },
    });
  }

  private cargarDatosIniciales(): void {
    this.cargandoInicial.set(true);
    this.errorInicial.set('');
    this.pedagogiaService.datosInicialesProgramacionPedagogia().subscribe({
      next: (respuesta) => {
        this.cargandoInicial.set(false);
        if (respuesta.success === false) {
          this.errorInicial.set(
            respuesta.msg ?? respuesta.message ?? 'No fue posible cargar el formulario.',
          );
          return;
        }
        const resultado = this.extraerDatosIniciales(respuesta.data);
        if (resultado.error) {
          this.errorInicial.set(resultado.error);
          return;
        }
        this.capacitadores.set(resultado.capacitadores);
        this.pedagogias.set(resultado.pedagogias);
        this.fechas.set(resultado.fechas);
      },
      error: (error: unknown) => {
        this.cargandoInicial.set(false);
        const httpError = error instanceof HttpErrorResponse ? error : null;
        const cuerpo = this.aRegistro(httpError?.error);
        this.errorInicial.set(
          this.textoError(cuerpo?.['message']) ??
            this.textoError(cuerpo?.['msg']) ??
            (httpError?.status === 401
              ? 'No tiene permiso para programar pedagogías.'
              : 'No fue posible cargar los datos para programar la pedagogía.'),
        );
        console.error('Error al cargar los datos de programación de pedagogía:', error);
      },
    });
  }

  private extraerDatosIniciales(data: unknown): {
    capacitadores: CapacitadorPedagogia[];
    pedagogias: CatalogoPedagogia[];
    fechas: FechaPedagogia[];
    error: string | null;
  } {
    const registro = this.aRegistro(data);
    if (!registro) {
      return this.datosInicialesInvalidos('El servicio devolvió datos iniciales inesperados.');
    }

    const capacitadores = this.extraerCapacitadores(registro['capacitadores']);
    const pedagogias = this.extraerPedagogias(registro['pedagogias']);
    const fechas = this.extraerFechas(registro['fechas']);
    if (!capacitadores || !pedagogias || !fechas) {
      return this.datosInicialesInvalidos('El servicio devolvió catálogos de programación inválidos.');
    }
    return { capacitadores, pedagogias, fechas, error: null };
  }

  private extraerCapacitadores(value: unknown): CapacitadorPedagogia[] | null {
    if (!Array.isArray(value)) {
      return null;
    }
    const resultado: CapacitadorPedagogia[] = [];
    for (const item of value) {
      const registro = this.aRegistro(item);
      const id = this.idNumerico(registro?.['id']);
      const nombre = this.textoError(registro?.['nombre']);
      if (id === null || nombre === null) {
        return null;
      }
      const direccion = this.textoError(registro?.['direccion']);
      resultado.push({ id, nombre, ...(direccion ? { direccion } : {}) });
    }
    return resultado;
  }

  private extraerPedagogias(value: unknown): CatalogoPedagogia[] | null {
    if (!Array.isArray(value)) {
      return null;
    }
    const resultado: CatalogoPedagogia[] = [];
    for (const item of value) {
      const registro = this.aRegistro(item);
      const id = this.idNumerico(registro?.['id']);
      const nombre = this.textoError(registro?.['nombre']);
      if (id === null || nombre === null) {
        return null;
      }
      resultado.push({
        id,
        nombre,
        tipo: this.textoError(registro?.['tipo']) ?? '',
        descripcion: this.textoError(registro?.['descripcion']) ?? '',
      });
    }
    return resultado;
  }

  private extraerFechas(value: unknown): FechaPedagogia[] | null {
    if (!Array.isArray(value)) {
      return null;
    }
    const resultado: FechaPedagogia[] = [];
    for (const item of value) {
      const registro = this.aRegistro(item);
      const fecha = this.textoError(registro?.['fecha']);
      if (fecha === null || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return null;
      }
      resultado.push({ fecha });
    }
    return resultado;
  }

  private fechaHoraLocal(fecha: string, hora: string): Date | null {
    const fechaPartes = fecha.split('-').map(Number);
    const horaPartes = hora.split(':').map(Number);
    if (fechaPartes.length !== 3 || horaPartes.length !== 2) {
      return null;
    }

    const [anio, mes, dia] = fechaPartes;
    const [horas, minutos] = horaPartes;
    if (
      anio === undefined ||
      mes === undefined ||
      dia === undefined ||
      horas === undefined ||
      minutos === undefined
    ) {
      return null;
    }

    const resultado = new Date(anio, mes - 1, dia, horas, minutos, 0, 0);
    if (
      resultado.getFullYear() !== anio ||
      resultado.getMonth() !== mes - 1 ||
      resultado.getDate() !== dia ||
      resultado.getHours() !== horas ||
      resultado.getMinutes() !== minutos
    ) {
      return null;
    }
    return resultado;
  }

  private datosInicialesInvalidos(error: string): {
    capacitadores: CapacitadorPedagogia[];
    pedagogias: CatalogoPedagogia[];
    fechas: FechaPedagogia[];
    error: string;
  } {
    return { capacitadores: [], pedagogias: [], fechas: [], error };
  }

  private idNumerico(value: unknown): number | null {
    const id = typeof value === 'number' ? value : Number(value);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  }

  private aRegistro(value: unknown): Registro | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Registro)
      : null;
  }

  private textoError(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value : null;
  }
}
