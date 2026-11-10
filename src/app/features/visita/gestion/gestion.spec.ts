import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';

import { VisitaCampo, VisitaDetalle } from '../../../core/interfaces/visita.interface';
import { VisitaLimpiaService } from '../../../core/services/visita-limpia.service';
import { VisitaService } from '../../../core/services/visita.service';
import { Gestion } from './gestion';

const visitaApi = {
  enviados: [] as { codigo: string; valor: string | number | null }[],
  imagenes: 0,
  /** Orden en que el componente llama al servicio. */
  llamadas: [] as string[],
  /** true: findById responde con error. */
  fallaDetalle: false,
  /** true: generar (obtenerFormulario) responde con error, como pasa en algunas visitas. */
  fallaFormulario: false,
  obtenerFormulario: (idVisita: number) => {
    visitaApi.llamadas.push(`generar ${idVisita}`);
    if (visitaApi.fallaFormulario) {
      return throwError(() => new Error('500'));
    }
    return of([]);
  },
  findById: (idVisita: number) => {
    visitaApi.llamadas.push(`findById ${idVisita}`);
    if (visitaApi.fallaDetalle) {
      return throwError(() => new Error('500'));
    }
    const visita: VisitaDetalle = {
      idVisita,
      estado: { nombre: 'Pendiente por visita' },
      visitador: { firstName: 'Pedro A', lastName: 'Perez Muriel A' },
      supervisor: null,
      tipoVisita: { descripcion: 'Control Posterior' },
      solicitud: { radicado: '20264199800000044', radicadohijo: null },
      radicadoInspeccion: null,
      latitud: '3.4372',
      longitud: '-76.5225',
    };
    return of(visita);
  },
  guardarCampo: (
    _idVisita: number,
    campo: { codigo: string; valor: string | number | null },
    valor: string | number | null = campo.valor,
  ) => {
    visitaApi.enviados.push({ codigo: campo.codigo, valor });
    return of({ success: true, value: 'guardado-servidor' });
  },
  guardarImagen: () => {
    visitaApi.imagenes += 1;
    return of({ success: false, msg: 'no guardada' });
  },
  urlDocumento: (nombre: string) => `http://saul.local/upload/documentos/${nombre}`,
};

describe('Gestion', () => {
  let component: Gestion;
  let fixture: ComponentFixture<Gestion>;

  beforeEach(async () => {
    visitaApi.enviados = [];
    visitaApi.imagenes = 0;
    visitaApi.llamadas = [];
    visitaApi.fallaDetalle = false;
    visitaApi.fallaFormulario = false;
    await TestBed.configureTestingModule({
      imports: [Gestion],
      providers: [
        VisitaLimpiaService,
        {
          provide: VisitaService,
          useValue: visitaApi,
        },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ idVisita: '3931' })),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Gestion);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    // cargarFormulario encadena dos await (generar → findById): se deja terminar la cadena.
    await new Promise((resolver) => setTimeout(resolver));
  });

  describe('modo Normal: pasos numerados (KIT UI SAUL3, pág. 12)', () => {
    beforeEach(() => {
      component.dataForm.set([
        { ...categoriaRegistro([]), id: 11, nombre: 'Datos generales' },
        { ...categoriaRegistro([]), id: 12, nombre: 'Licencia' },
      ]);
      fixture.detectChanges();
    });

    it('arma un paso por categoría, con el Mapa primero, y abre solo el primero', () => {
      expect(component.pasos().map((paso) => paso.nombre)).toEqual(['Mapa', 'Datos generales', 'Licencia']);
      const raiz: HTMLElement = fixture.nativeElement;
      expect(raiz.querySelectorAll('.paso')).toHaveLength(3);
      expect(raiz.querySelector('.gestion-sidebar')).toBeNull();
      const abiertos = [...raiz.querySelectorAll<HTMLElement>('.paso__cuerpo')].filter((cuerpo) => !cuerpo.hidden);
      expect(abiertos).toHaveLength(1);
      expect([0, 1, 2].map((i) => component.estadoPaso(i))).toEqual(['actual', 'pendiente', 'pendiente']);
    });

    it('Continuar marca el paso como hecho y abre el siguiente', () => {
      component.continuarPaso(0);
      expect([0, 1, 2].map((i) => component.estadoPaso(i))).toEqual(['hecho', 'actual', 'pendiente']);
      expect(component.categoriaActivaId).toBe(11);
    });

    it('se puede volver a un paso anterior sin perder los hechos', () => {
      component.continuarPaso(0);
      component.continuarPaso(1);
      component.abrirPaso(0);
      expect([0, 1, 2].map((i) => component.estadoPaso(i))).toEqual(['actual', 'hecho', 'pendiente']);
    });

    it('el último paso no tiene Continuar', () => {
      component.abrirPaso(2);
      fixture.detectChanges();
      const ultimo = (fixture.nativeElement as HTMLElement).querySelectorAll('.paso')[2];
      expect(ultimo.querySelector('.paso__acciones')).toBeNull();
    });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('consulta la visita (findById) después de generar el formulario', () => {
    expect(visitaApi.llamadas).toEqual(['generar 3931', 'findById 3931']);
    expect(component.visitaDetalle()?.idVisita).toBe(3931);
    expect(component.visitaDetalle()?.latitud).toBe('3.4372');
  });

  it('si generar falla, igual consulta la visita, muestra el encabezado y avisa', async () => {
    visitaApi.fallaFormulario = true;
    visitaApi.llamadas = [];
    const otro = TestBed.createComponent(Gestion);
    otro.detectChanges();
    // Sin whenStable: esperaría también la carga del mapa ArcGIS (varios segundos).
    // Basta con dejar terminar la cadena generar (falla) → findById.
    await new Promise((resolver) => setTimeout(resolver));
    otro.detectChanges();

    expect(visitaApi.llamadas).toEqual(['generar 3931', 'findById 3931']);
    expect(otro.componentInstance.dataForm()).toEqual([]);
    expect(otro.componentInstance.encabezado()?.consecutivo).toBe(3931);
    expect(otro.componentInstance.mensajeError()).toBe(
      'No se pudo cargar el formulario de la visita. Intente recargar la página.',
    );
    const raiz: HTMLElement = otro.nativeElement;
    expect(raiz.querySelector('.gestion-encabezado h1')?.textContent?.trim()).toBe('Registro de Visita');
    expect(raiz.querySelector('.gestion-error')?.textContent).toContain('No se pudo cargar el formulario');
    otro.destroy();
  });

  it('centra el mapa en la ubicación de la visita consultada', () => {
    expect(component.ubicacion()).toEqual({ latitud: 3.4372, longitud: -76.5225 });
    expect(component.centroMapa()).toEqual({ latitud: 3.4372, longitud: -76.5225 });
  });

  it('si la visita no trae coordenadas, el mapa queda en Cali', () => {
    component.visitaDetalle.set({ idVisita: 3931, latitud: null, longitud: '' });

    expect(component.ubicacion()).toBeNull();
    expect(component.centroMapa()).toEqual({ latitud: 3.4516, longitud: -76.5225 });
  });

  it('si la consulta de la visita falla, avisa y deja el formulario sin encabezado', async () => {
    visitaApi.fallaDetalle = true;
    component.visitaDetalle.set(null);

    await component.consultarVisita(3931);
    fixture.detectChanges();

    expect(component.mensajeError()).toBe(
      'No se pudo consultar la información de la visita. Intente recargar la página.',
    );
    expect(component.encabezado()).toBeNull();
    expect(fixture.nativeElement.querySelector('.gestion-error')?.textContent).toContain(
      'No se pudo consultar la información de la visita',
    );
  });

  it('muestra el encabezado «Registro de Visita» con los datos de GET /visita/{id}', () => {
    fixture.detectChanges();
    const raiz: HTMLElement = fixture.nativeElement;
    const encabezado = raiz.querySelector('.gestion-encabezado');
    expect(encabezado?.querySelector('h1')?.textContent?.trim()).toBe('Registro de Visita');
    const datos = [...(encabezado?.querySelectorAll('dl > div') ?? [])].map((fila) =>
      [fila.querySelector('dt')?.textContent?.trim(), fila.querySelector('dd')?.textContent?.trim()].join(': '),
    );
    expect(datos).toEqual([
      'Consecutivo: 3931',
      'Estado: Pendiente por visita',
      'Visitador: Pedro A Perez Muriel A',
      'Revisor: Sin asignar',
      'Tipo de Visita: Control Posterior',
      'Radicado Solicitud: 20264199800000044',
    ]);
  });

  it('conserva solo el texto de celda que no repite fila ni columna', () => {
    const campo = {
      id: 1,
      codigo: 'v6_pago',
      nombre: 'Impuesto predial',
      tipo: 'texto-min',
      label: 'Impuesto predial',
      dominio: null,
      opciones: null,
      descripcion: null,
      soloLectura: false,
      valor: null,
    };

    expect(component.etiquetaAdicional(campo, 'Valor', 'Impuesto predial')).toBe('');
    expect(component.etiquetaAdicional({ ...campo, label: 'Valor' }, 'Valor', 'Impuesto predial')).toBe('');
    expect(
      component.etiquetaAdicional({ ...campo, label: 'Valor en pesos' }, 'Valor', 'Impuesto predial'),
    ).toBe('Valor en pesos');
    expect(component.etiquetaAccesible('Impuesto predial', 'Valor', 'Valor en pesos')).toBe(
      'Impuesto predial, Valor, Valor en pesos',
    );
  });

  it('oculta las etiquetas repetidas en todas las tablas y las conserva fuera de ellas', () => {
    const pago = {
      id: 10,
      codigo: 'v6_predial_valor',
      nombre: 'Impuesto predial',
      tipo: 'texto-min',
      label: 'Impuesto predial',
      dominio: null,
      opciones: null,
      descripcion: null,
      soloLectura: false,
      valor: '12000',
    };
    const estado = {
      id: 11,
      codigo: 'v6_predial_estado',
      nombre: 'Impuesto predial',
      tipo: 'select-one',
      label: 'Estado del pago',
      dominio: null,
      opciones: ['Al día', 'En mora'],
      descripcion: null,
      soloLectura: false,
      valor: 'Al día',
    };
    const direccion = {
      id: 20,
      codigo: 'v6_direccion',
      nombre: 'Dirección',
      tipo: 'texto-min',
      label: null,
      dominio: null,
      opciones: null,
      descripcion: null,
      soloLectura: false,
      valor: 'Calle 10',
    };

    component.idVisita = 1;
    component.dataForm.set([
      {
        id: 1,
        nombre: 'Verificación de pagos',
        posicion: 1,
        descripcion: null,
        creadoEn: null,
        actualizadoEn: null,
        campos: [pago, estado],
        tabla: {
          encabezados: ['Ítem', 'Valor', 'Estado'],
          tituloIndependiente: true,
          filas: [{ titulo: 'Impuesto predial', celdas: [pago, estado] }],
        },
      },
      {
        id: 2,
        nombre: 'Datos',
        posicion: 2,
        descripcion: null,
        creadoEn: null,
        actualizadoEn: null,
        campos: [direccion],
        tabla: null,
      },
    ]);
    fixture.detectChanges();

    const raiz: HTMLElement = fixture.nativeElement;
    const etiquetasTabla = [...raiz.querySelectorAll('.gestion-tabla label')];
    expect(etiquetasTabla).toHaveLength(2);
    expect(etiquetasTabla.every((etiqueta) => etiqueta.classList.contains('campo-etiqueta--oculta'))).toBe(
      true,
    );
    expect(etiquetasTabla[1].textContent).toContain('Impuesto predial, Estado, Estado del pago');
    expect(raiz.querySelectorAll('.gestion-celda__detalle')).toHaveLength(0);
    expect(raiz.querySelector('.gestion-campo label')?.classList.contains('campo-etiqueta--oculta')).toBe(
      false,
    );
    expect(raiz.querySelector('.gestion-campo label')?.textContent).toContain('Dirección');
  });

  it('guarda el texto al perder el foco y aplica el valor devuelto', () => {
    const campo = campoTexto(20, 'v6_direccion', 'Dirección', '');
    component.dataForm.set([categoriaRegistro([campo])]);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('#campo-20') as HTMLInputElement;
    input.value = 'Calle 20';
    input.dispatchEvent(new Event('blur'));

    expect(visitaApi.enviados).toEqual([{ codigo: 'v6_direccion', valor: 'Calle 20' }]);
    expect(campo.valor).toBe('guardado-servidor');
  });

  it('envía la fecha con el formato de America/Bogota', () => {
    const campo = { ...campoTexto(21, 'v_fecha', 'Fecha', '2026-10-20'), tipo: 'fecha' };
    component.dataForm.set([categoriaRegistro([campo])]);
    component.saveItem(campo);

    expect(visitaApi.enviados[0].codigo).toBe('v_fecha');
    // El día elegido, sin correrse a 10/19 por la diferencia UTC/Bogotá.
    expect(visitaApi.enviados[0].valor).toBe('10/20/2026');
    expect(campo.valor).toBe('guardado-servidor');
  });

  it('en modo observación no guarda nada y deja los campos en solo lectura', () => {
    const campo = campoTexto(30, 'v6_obs', 'Observación', 'texto');
    component.idVisita = 9;
    component.modoObservacion = true;
    component.dataForm.set([categoriaRegistro([campo])]);
    fixture.detectChanges();

    component.actualizarValor(campo, 'cambiado');
    component.saveItem(campo);

    expect(visitaApi.enviados).toEqual([]);
    expect(campo.valor).toBe('texto');
    const input = fixture.nativeElement.querySelector('#campo-30') as HTMLInputElement;
    expect(input.readOnly).toBe(true);
  });

  it('usa inputs nativos de fecha, hora y número con el valor que guarda SAUL', () => {
    const fecha = { ...campoTexto(31, 'v_fecha', 'Fecha', '10/20/2026'), tipo: 'fecha' };
    const hora = { ...campoTexto(32, 'v_hora', 'Hora', '1/1/1970, 2:30:00 PM'), tipo: 'hora' };
    const numero = { ...campoTexto(33, 'v_num', 'Número', '1.00'), tipo: 'numero' };
    component.idVisita = 9;
    component.dataForm.set([categoriaRegistro([fecha, hora, numero])]);
    fixture.detectChanges();

    const raiz: HTMLElement = fixture.nativeElement;
    const inputFecha = raiz.querySelector('#campo-31') as HTMLInputElement;
    const inputHora = raiz.querySelector('#campo-32') as HTMLInputElement;
    const inputNumero = raiz.querySelector('#campo-33') as HTMLInputElement;
    expect(inputFecha.type).toBe('date');
    expect(inputFecha.value).toBe('2026-10-20');
    expect(inputHora.type).toBe('time');
    expect(inputHora.value).toBe('14:30');
    expect(inputNumero.type).toBe('number');
    expect(inputNumero.getAttribute('step')).toBe('0.01');
  });

  it('la hora se guarda al cambiar (como ng-change de SAUL) y no otra vez al perder el foco', () => {
    const hora = { ...campoTexto(34, 'v_hora', 'Hora', ''), tipo: 'hora' };
    component.idVisita = 9;
    component.dataForm.set([categoriaRegistro([hora])]);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('#campo-34') as HTMLInputElement;
    input.value = '14:30';
    input.dispatchEvent(new Event('change'));
    input.dispatchEvent(new Event('blur'));

    expect(visitaApi.enviados).toEqual([{ codigo: 'v_hora', valor: '1/1/1970, 2:30:00 PM' }]);
  });

  it('no envía una imagen con extensión distinta de png, jpeg o jpg', () => {
    const campo = campoImagen(30, 'v13_imagen_fachada', 'Foto fachada', null);
    const archivo = new File(['img'], 'fachada.gif', { type: 'image/gif' });
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [archivo] });

    component.onArchivoSeleccionado(campo, { target: input } as unknown as Event);

    expect(visitaApi.imagenes).toBe(0);
    expect(component.mensajeError()).toContain('PNG, JPEG o JPG');
    expect(campo.valor).toBeNull();
  });

  it('conserva la imagen guardada al quitar una selección pendiente', () => {
    const campo = {
      id: 30,
      codigo: 'v13_imagen_fachada',
      nombre: 'Foto fachada',
      tipo: 'imagen',
      label: null,
      dominio: null,
      opciones: null,
      descripcion: null,
      soloLectura: false,
      valor: 'fachada-guardada.png',
    };
    const archivo = new File(['img'], 'fachada.png', { type: 'image/png' });
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [archivo] });

    component.idVisita = 9;
    component.onArchivoSeleccionado(campo, { target: input } as unknown as Event);

    expect(component.archivoPendiente(campo.codigo)).toBe(archivo);
    expect(component.vistaPrevia(campo.codigo)).toContain('blob:');
    expect(campo.valor).toBe('fachada-guardada.png');

    component.limpiarSeleccion(campo);

    expect(component.archivoPendiente(campo.codigo)).toBeNull();
    expect(campo.valor).toBe('fachada-guardada.png');
  });

  it('agrupa cada imagen con su descripción opcional, sin mirar el código', () => {
    const portada = campoImagen(1, 'foto_portada', 'Portada', null);
    const lateral = campoImagen(2, 'img_lado_a', 'Lateral', 'a.png');
    const notaLateral = campoTexto(3, 'obs_x', 'Nota lateral', 'izquierda');
    const trasera = campoImagen(4, 'zz_9', 'Trasera', null);
    const notaTrasera = campoTexto(5, 'comentario', 'Nota trasera', '');
    const final = campoImagen(6, 'ultima', 'Final', null);
    const suelto = { ...campoTexto(7, 'k', 'Fecha', ''), tipo: 'fecha' };
    const campos = [suelto, portada, lateral, notaLateral, trasera, notaTrasera, final];

    const bloques = component.bloquesCampos(campos);

    expect(bloques.map((bloque) => bloque.campos.map((campo) => campo.id))).toEqual([[7], []]);
    expect(bloques[1].filas.map((fila) => fila.map((celda) => [celda.campo.id, celda.clase]))).toEqual([
      [
        [1, 'col-12 col-md-6 order-md-1'],
        [2, 'col-12 col-md-6 order-md-2'],
        [3, 'col-12 col-md-6 order-md-4 offset-md-6'],
      ],
      [
        [4, 'col-12 col-md-6 order-md-1'],
        [5, 'col-12 col-md-6 order-md-3'],
        [6, 'col-12 col-md-6 order-md-2'],
      ],
    ]);
    expect(component.bloquesCampos(campos)).toBe(bloques);
  });

  it('pone dos imágenes seguidas sin descripción en la misma fila', () => {
    component.idVisita = 9;
    component.dataForm.set([categoriaRegistro([campoImagen(1, 'p', 'Uno', null), campoImagen(2, 'q', 'Dos', null)])]);
    fixture.detectChanges();

    const filas = [...fixture.nativeElement.querySelectorAll('.gestion-registro')] as HTMLElement[];
    expect(filas).toHaveLength(1);
    expect(idsEnOrden(filas[0])).toEqual(['campo-1', 'campo-2']);
    expect(columna(filas[0], 'campo-1').classList.contains('order-md-1')).toBe(true);
    expect(columna(filas[0], 'campo-2').classList.contains('order-md-2')).toBe(true);
  });

  it('deja la descripción de la segunda imagen debajo de ella cuando la primera no tiene', () => {
    component.idVisita = 9;
    component.dataForm.set([
      categoriaRegistro([
        campoImagen(1, 'p', 'Sin nota', null),
        campoImagen(2, 'q', 'Con nota', null),
        campoTexto(3, 'r', 'Nota', 'texto'),
      ]),
    ]);
    fixture.detectChanges();

    const fila = fixture.nativeElement.querySelector('.gestion-registro') as HTMLElement;
    expect(idsEnOrden(fila)).toEqual(['campo-1', 'campo-2', 'campo-3']);
    const descripcion = columna(fila, 'campo-3');
    expect(descripcion.classList.contains('order-md-4')).toBe(true);
    expect(descripcion.classList.contains('offset-md-6')).toBe(true);
    expect(descripcion.classList.contains('col-md-6')).toBe(true);
    expect(fila.querySelector('.w-100.d-md-block')).toBeNull();
  });

  it('en una tabla de dos filas solo deja visibles los encabezados y los títulos de fila', () => {
    const celda = (id: number, nombre: string) => campoTexto(id, `t${id}`, nombre, '');
    const filaA = [celda(1, 'CESIÓN DE VÍAS'), celda(2, 'CESIÓN DE VÍAS')];
    const filaB = [celda(3, 'RED DE GAS'), celda(4, 'RED DE GAS')];
    component.idVisita = 9;
    component.dataForm.set([
      {
        ...categoriaRegistro([...filaA, ...filaB]),
        tabla: {
          encabezados: ['Ítem', 'Aprobado en planos', 'Verificado en obra'],
          tituloIndependiente: true,
          filas: [
            { titulo: 'CESIÓN DE VÍAS', celdas: filaA },
            { titulo: 'RED DE GAS', celdas: filaB },
          ],
        },
      },
    ]);
    fixture.detectChanges();

    const raiz: HTMLElement = fixture.nativeElement;
    expect([...raiz.querySelectorAll('.gestion-tabla thead th')].map((th) => th.textContent?.trim())).toEqual([
      'Ítem',
      'Aprobado en planos',
      'Verificado en obra',
    ]);
    expect([...raiz.querySelectorAll('.gestion-tabla tbody th')].map((th) => th.textContent?.trim())).toEqual([
      'CESIÓN DE VÍAS',
      'RED DE GAS',
    ]);
    const celdas = [...raiz.querySelectorAll('.gestion-tabla td')] as HTMLElement[];
    expect(celdas).toHaveLength(4);
    for (const td of celdas) {
      const visibles = [...td.querySelectorAll('label, p, span')].filter(
        (nodo) =>
          !nodo.classList.contains('campo-etiqueta--oculta') && !nodo.classList.contains('gestion-celda__columna'),
      );
      expect(visibles).toEqual([]);
      expect(td.querySelector('.gestion-celda__columna')?.getAttribute('aria-hidden')).toBe('true');
    }
    expect(raiz.querySelector('label[for="campo-2"]')?.textContent).toContain('CESIÓN DE VÍAS, Verificado en obra');
  });

  it('no pinta la columna del título si ninguna fila lo trae', () => {
    const filaA = [campoTexto(1, 'a', '', ''), campoTexto(2, 'b', '', '')];
    component.idVisita = 9;
    component.dataForm.set([
      {
        ...categoriaRegistro(filaA),
        tabla: { encabezados: ['', 'Uno', 'Dos'], tituloIndependiente: true, filas: [{ titulo: '', celdas: filaA }] },
      },
    ]);
    fixture.detectChanges();

    const raiz: HTMLElement = fixture.nativeElement;
    expect(raiz.querySelectorAll('.gestion-tabla tbody th')).toHaveLength(0);
    expect([...raiz.querySelectorAll('.gestion-tabla thead th')].map((th) => th.textContent?.trim())).toEqual([
      'Uno',
      'Dos',
    ]);
  });

  it('no agrega columna de numeración "#" a una tabla ancha sin columna de título', () => {
    const encabezados = Array.from({ length: 10 }, (_, i) => `Columna ${i + 1}`);
    const tabla = tablaDePrueba(encabezados, false, ['1', '2', '3', '4', '5'], 10);
    pintarTabla(tabla);

    const raiz: HTMLElement = fixture.nativeElement;
    const contenedor = raiz.querySelector('.gestion-tabla__contenedor');
    expect(contenedor?.classList.contains('gestion-tabla__contenedor--compacta')).toBe(false);
    expect(raiz.querySelector('colgroup')).toBeNull();
    const encabezadosPintados = [...raiz.querySelectorAll('.gestion-tabla thead th')];
    expect(encabezadosPintados.map((th) => th.textContent?.trim())).toEqual(encabezados);
    expect(encabezadosPintados[0].className).toBe('');
    expect(raiz.querySelectorAll('.gestion-tabla tbody th')).toHaveLength(0);
    expect(raiz.querySelectorAll('.gestion-tabla tbody tr:first-child td')).toHaveLength(10);
    expect(tabla.encabezados).toEqual(encabezados);
    expect(component.etiquetaColumna(tabla, 0)).toBe('Columna 1');
    expect(component.etiquetaColumna(tabla, 9)).toBe('Columna 10');
    expect(raiz.querySelector('label[for="campo-1"]')?.textContent).toContain('1, Columna 1');
  });

  it('deja compacta una tabla de tres columnas con título de fila propio', () => {
    const tabla = tablaDePrueba(
      ['Ítem', 'Aprobado en planos', 'Verificado en obra'],
      true,
      ['CESIÓN DE VÍAS', 'RED DE GAS'],
      2,
    );
    pintarTabla(tabla);

    const raiz: HTMLElement = fixture.nativeElement;
    const contenedor = raiz.querySelector('.gestion-tabla__contenedor');
    expect(contenedor?.classList.contains('gestion-tabla__contenedor--compacta')).toBe(true);
    const encabezadosPintados = [...raiz.querySelectorAll('.gestion-tabla thead th')];
    expect(encabezadosPintados.map((th) => th.textContent?.trim())).toEqual([
      'Ítem',
      'Aprobado en planos',
      'Verificado en obra',
    ]);
    expect(encabezadosPintados[0].classList.contains('gestion-tabla__titulo')).toBe(true);
    const titulos = [...raiz.querySelectorAll('.gestion-tabla tbody th[scope="row"]')];
    expect(titulos.map((th) => th.textContent?.trim())).toEqual(['CESIÓN DE VÍAS', 'RED DE GAS']);
    expect(titulos.every((th) => th.classList.contains('gestion-tabla__titulo'))).toBe(true);
    expect(raiz.querySelector('.gestion-tabla__numero')).toBeNull();
    expect(component.etiquetaColumna(tabla, 0)).toBe('Aprobado en planos');
    expect(component.etiquetaColumna(tabla, 1)).toBe('Verificado en obra');
  });

  it('no numera filas cuando los títulos se repiten o vienen vacíos', () => {
    for (const titulos of [
      ['A', 'A', 'B'],
      ['1', '', '3'],
      [' Uno ', 'uno', 'Dos'],
    ]) {
      const tabla = tablaDePrueba(['Uno', 'Dos'], false, titulos, 2);
      pintarTabla(tabla);

      const raiz: HTMLElement = fixture.nativeElement;
      expect([...raiz.querySelectorAll('.gestion-tabla thead th')].map((th) => th.textContent?.trim())).toEqual([
        'Uno',
        'Dos',
      ]);
      expect(raiz.querySelectorAll('.gestion-tabla tbody th')).toHaveLength(0);
      expect(raiz.querySelector('.gestion-tabla__numero')).toBeNull();
      expect(component.etiquetaColumna(tabla, 0)).toBe('Uno');
      expect(component.etiquetaColumna(tabla, 1)).toBe('Dos');
    }
  });

  function tablaDePrueba(encabezados: string[], tituloIndependiente: boolean, titulos: string[], columnas: number) {
    let id = 0;
    return {
      encabezados,
      tituloIndependiente,
      filas: titulos.map((titulo) => ({
        titulo,
        celdas: Array.from({ length: columnas }, () => {
          id += 1;
          return campoTexto(id, `t${id}`, '', '');
        }),
      })),
    };
  }

  function pintarTabla(tabla: ReturnType<typeof tablaDePrueba>): void {
    component.idVisita = 9;
    component.dataForm.set([
      { ...categoriaRegistro(tabla.filas.flatMap((fila) => fila.celdas)), tabla },
    ]);
    fixture.detectChanges();
  }

  it('deja un registro impar al final en media fila, con su descripción bajo la imagen', () => {
    const campos = [
      campoImagen(1, 'a', 'Uno', null),
      campoTexto(2, 'b', 'Nota uno', ''),
      campoImagen(3, 'c', 'Dos', null),
      campoTexto(4, 'd', 'Nota dos', ''),
      campoImagen(5, 'e', 'Tres', null),
      campoTexto(6, 'f', 'Nota tres', ''),
    ];

    const filas = component.bloquesCampos(campos)[0].filas;

    expect(filas).toHaveLength(2);
    expect(filas[1].map((celda) => [celda.campo.id, celda.clase, celda.salto])).toEqual([
      [5, 'col-12 col-md-6 order-md-1', false],
      [6, 'col-12 col-md-6 order-md-3', true],
    ]);

    component.idVisita = 9;
    component.dataForm.set([categoriaRegistro(campos)]);
    fixture.detectChanges();
    const ultima = [...fixture.nativeElement.querySelectorAll('.gestion-registro')][1] as HTMLElement;
    const salto = ultima.querySelector('.w-100.d-md-block');
    expect(salto?.classList.contains('order-md-2')).toBe(true);
    expect(columna(ultima, 'campo-6').className).not.toContain('col-md-12');
  });

  it('pone una fecha suelta en media fila y un texto largo a lo ancho con textarea que guarda al salir', () => {
    const fecha = { ...campoTexto(40, 'x1', 'Fecha', '2026-10-20'), tipo: 'fecha' };
    const observaciones = { ...campoTexto(41, 'x2', 'Observaciones', 'texto previo'), tipo: 'texto-largo' };
    const sinFila = { ...campoTexto(42, 'x3', 'Suelto', ''), tipo: 'select-one', opciones: ['Si', 'No'] };
    component.idVisita = 9;
    component.dataForm.set([categoriaRegistro([fecha, observaciones, sinFila])]);
    fixture.detectChanges();

    const raiz: HTMLElement = fixture.nativeElement;
    const columnaFecha = raiz.querySelector('#campo-40')?.closest('.gestion-campo') as HTMLElement;
    expect(columnaFecha.className).toContain('col-12');
    expect(columnaFecha.className).toContain('col-md-6');
    expect((raiz.querySelector('#campo-42')?.closest('.gestion-campo') as HTMLElement).className).toContain(
      'col-md-6',
    );

    const cuadro = raiz.querySelector('#campo-41') as HTMLTextAreaElement;
    expect(cuadro.tagName).toBe('TEXTAREA');
    expect(cuadro.closest('app-textarea')).not.toBeNull();
    const columnaTexto = cuadro.closest('.gestion-campo') as HTMLElement;
    expect(columnaTexto.className).toContain('col-12');
    expect(columnaTexto.className).not.toContain('col-md-6');

    cuadro.value = 'línea 1\nlínea 2';
    cuadro.dispatchEvent(new Event('blur'));

    expect(visitaApi.enviados).toEqual([{ codigo: 'x2', valor: 'línea 1\nlínea 2' }]);
    expect(observaciones.valor).toBe('guardado-servidor');
  });

  it('renderiza un par de registro', () => {
    component.idVisita = 9;
    component.dataForm.set([
      categoriaRegistro([
        campoImagen(2, 'v13_imagen_registro1', 'FOTO No. 1', 'foto-1.png'),
        campoTexto(3, 'v13_descripcion_registro1', 'Descripción FOTO No. 1', 'norte'),
      ]),
    ]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.gestion-registro').length).toBe(1);
  });

  it('renderiza fachada y dos pares', () => {
    component.idVisita = 9;
    component.dataForm.set([
      categoriaRegistro([
        campoImagen(1, 'v13_imagen_fachada', 'Foto fachada', null),
        campoImagen(2, 'v13_imagen_registro1', 'FOTO No. 1', 'foto-1.png'),
        campoTexto(3, 'v13_descripcion_registro1', 'Descripción FOTO No. 1', 'norte'),
        campoImagen(4, 'v13_imagen_registro2', 'FOTO No. 2', 'foto-2.png'),
        campoTexto(5, 'v13_descripcion_registro2', 'Descripción FOTO No. 2', ''),
      ]),
    ]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.gestion-registro').length).toBe(2);
  });

  it('renderiza un registro suelto', () => {
    component.idVisita = 9;
    component.dataForm.set([
      categoriaRegistro([
        campoImagen(10, 'v13_imagen_registro5', 'FOTO No. 5', 'foto-5.png'),
        campoTexto(11, 'v13_descripcion_registro5', 'Descripción FOTO No. 5', ''),
      ]),
    ]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.w-100.d-none.d-md-block')).not.toBeNull();
  });

  it('renderiza dos filas de pares', () => {
    component.idVisita = 9;
    component.dataForm.set([
      categoriaRegistro([
        campoImagen(2, 'v13_imagen_registro1', 'FOTO No. 1', 'foto-1.png'),
        campoTexto(3, 'v13_descripcion_registro1', 'Descripción FOTO No. 1', 'norte'),
        campoImagen(4, 'v13_imagen_registro2', 'FOTO No. 2', null),
        campoTexto(5, 'v13_descripcion_registro2', 'Descripción FOTO No. 2', ''),
        campoImagen(6, 'v13_imagen_registro3', 'FOTO No. 3', null),
        campoTexto(7, 'v13_descripcion_registro3', 'Descripción FOTO No. 3', ''),
        campoImagen(8, 'v13_imagen_registro4', 'FOTO No. 4', 'foto-4.png'),
        campoTexto(9, 'v13_descripcion_registro4', 'Descripción FOTO No. 4', ''),
        campoImagen(10, 'v13_imagen_registro5', 'FOTO No. 5', null),
        campoTexto(11, 'v13_descripcion_registro5', 'Descripción FOTO No. 5', ''),
      ]),
    ]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.gestion-registro').length).toBe(3);
  });

  it('alinea cada imagen con la columna de su descripción', () => {
    const fachada = campoImagen(1, 'v13_imagen_fachada', 'Foto fachada', null);
    const foto1 = campoImagen(2, 'v13_imagen_registro1', 'FOTO No. 1', 'foto-1.png');
    const desc1 = campoTexto(3, 'v13_descripcion_registro1', 'Descripción FOTO No. 1', 'Fachada norte');
    const foto2 = campoImagen(4, 'v13_imagen_registro2', 'FOTO No. 2', null);
    const desc2 = campoTexto(5, 'v13_descripcion_registro2', 'Descripción FOTO No. 2', '');
    const foto3 = campoImagen(6, 'v13_imagen_registro3', 'FOTO No. 3', null);
    const desc3 = campoTexto(7, 'v13_descripcion_registro3', 'Descripción FOTO No. 3', '');
    const nombreLargo = 'plano-de-localizacion-con-un-nombre-extremadamente-largo-que-no-debe-desbordar.png';
    const foto4 = campoImagen(8, 'v13_imagen_registro4', 'FOTO No. 4', nombreLargo);
    const desc4 = campoTexto(9, 'v13_descripcion_registro4', 'Descripción FOTO No. 4', '');
    const foto5 = campoImagen(10, 'v13_imagen_registro5', 'FOTO No. 5', null);
    const desc5 = campoTexto(11, 'v13_descripcion_registro5', 'Descripción FOTO No. 5', '');

    component.idVisita = 9;
    component.dataForm.set([
      {
        id: 8,
        nombre: 'Registros fotográficos',
        posicion: 1,
        descripcion: null,
        creadoEn: null,
        actualizadoEn: null,
        campos: [fachada, foto1, desc1, foto2, desc2, foto3, desc3, foto4, desc4, foto5, desc5],
        tabla: null,
      },
    ]);
    fixture.detectChanges();

    const raiz: HTMLElement = fixture.nativeElement;
    const filas = [...raiz.querySelectorAll('.gestion-registro')];
    expect(filas).toHaveLength(3);
    expect(idsEnOrden(filas[0])).toEqual(['campo-1', 'campo-2', 'campo-3']);
    expect(idsEnOrden(filas[1])).toEqual(['campo-4', 'campo-5', 'campo-6', 'campo-7']);
    expect(idsEnOrden(filas[2])).toEqual(['campo-8', 'campo-9', 'campo-10', 'campo-11']);

    expect(columna(filas[0], 'campo-1').classList.contains('order-md-1')).toBe(true);
    expect(columna(filas[0], 'campo-2').classList.contains('order-md-2')).toBe(true);
    expect(columna(filas[0], 'campo-3').classList.contains('order-md-4')).toBe(true);
    expect(columna(filas[0], 'campo-3').classList.contains('offset-md-6')).toBe(true);
    expect(columna(filas[1], 'campo-4').classList.contains('order-md-1')).toBe(true);
    expect(columna(filas[1], 'campo-6').classList.contains('order-md-2')).toBe(true);
    expect(columna(filas[1], 'campo-5').classList.contains('order-md-3')).toBe(true);
    expect(columna(filas[1], 'campo-7').classList.contains('order-md-4')).toBe(true);
    expect(columna(filas[0], 'campo-2').className).toContain('col-md-6');
    expect(columna(filas[0], 'campo-3').className).toContain('col-md-6');

    const selector = raiz.querySelector('#campo-2') as HTMLInputElement;
    expect(selector.type).toBe('file');
    expect(raiz.querySelector('label[for="campo-2"]')?.textContent).toContain('FOTO No. 1');
    expect(columna(filas[0], 'campo-2').querySelector('.gestion-archivo')?.classList.contains('form-control')).toBe(
      true,
    );
    expect(columna(filas[0], 'campo-2').querySelector('.gestion-archivo__nombre')?.textContent).toBe('foto-1.png');
    expect(columna(filas[0], 'campo-2').querySelector('img')?.getAttribute('src')).toContain('foto-1.png');
    expect(columna(filas[1], 'campo-4').querySelector('.gestion-archivo__nombre')?.textContent).toBe(
      'Ningún archivo seleccionado',
    );

    const archivo = new File(['img'], nombreLargo, { type: 'image/png' });
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [archivo] });
    component.onArchivoSeleccionado(foto4, { target: input } as unknown as Event);
    fixture.detectChanges();

    const grupoPendiente = columna(filas[2], 'campo-8');
    expect(grupoPendiente.querySelector('.gestion-archivo__nombre')?.textContent).toBe(nombreLargo);
    expect(grupoPendiente.querySelector('img')?.getAttribute('alt')).toContain(nombreLargo);
    expect(grupoPendiente.textContent).toContain('Quitar selección');
    expect(foto4.valor).toBe(nombreLargo);
  });
});

function idsEnOrden(fila: Element): string[] {
  return [...fila.querySelectorAll('[id^="campo-"]')].map((elemento) => elemento.id);
}

function columna(fila: Element, id: string): HTMLElement {
  const campo = fila.querySelector(`#${id}`)?.closest('.gestion-campo');
  if (!(campo instanceof HTMLElement)) {
    throw new Error(`No está la columna ${id}`);
  }
  return campo;
}

function categoriaRegistro(campos: VisitaCampo[]) {
  return {
    id: 8,
    nombre: 'Registros fotográficos',
    posicion: 1,
    descripcion: null,
    creadoEn: null,
    actualizadoEn: null,
    campos,
    tabla: null,
  };
}

function campoImagen(id: number, codigo: string, nombre: string, valor: string | null) {
  return {
    id,
    codigo,
    nombre,
    tipo: 'imagen',
    label: null,
    dominio: null,
    opciones: null,
    descripcion: null,
    soloLectura: false,
    valor,
  };
}

function campoTexto(id: number, codigo: string, nombre: string, valor: string) {
  return {
    id,
    codigo,
    nombre,
    tipo: 'texto-min',
    label: null,
    dominio: null,
    opciones: null,
    descripcion: null,
    soloLectura: false,
    valor,
    clase: 'col-md-6',
  };
}
