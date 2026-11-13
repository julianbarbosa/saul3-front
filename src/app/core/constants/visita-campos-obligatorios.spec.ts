import {
  esMarcaRequerido,
  normalizarNombreCampo,
  resolverNombresObligatorios,
  tipoControlDesdeTexto,
} from './visita-campos-obligatorios';

const nombres = (...valores: string[]): Set<string> => new Set(valores.map(normalizarNombreCampo));

describe('visita-campos-obligatorios', () => {
  describe('normalizarNombreCampo', () => {
    it('ignora tildes, mayúsculas, signos y palabras vacías', () => {
      expect(normalizarNombreCampo('Fecha de Visita')).toBe('fecha visita');
      expect(normalizarNombreCampo('FECHA_VISITA')).toBe('fecha visita');
      expect(normalizarNombreCampo('Matrícula inmobiliaria:')).toBe('matricula inmobiliaria');
      expect(normalizarNombreCampo('¿Existe proceso constructivo y/o demolición?')).toBe(
        'existe proceso constructivo demolicion',
      );
    });

    it('devuelve cadena vacía para null/undefined', () => {
      expect(normalizarNombreCampo(null)).toBe('');
      expect(normalizarNombreCampo(undefined)).toBe('');
    });
  });

  describe('resolverNombresObligatorios', () => {
    it('detecta Control Preventivo por los campos presentes', () => {
      const obligatorios = resolverNombresObligatorios(
        nombres('Propietario', 'Vereda', 'Dirección'),
      );
      expect(obligatorios.has('propietario')).toBe(true);
      expect(obligatorios.has('nombre proyecto')).toBe(false);
    });

    it('detecta Control Posterior por los campos presentes', () => {
      const obligatorios = resolverNombresObligatorios(
        nombres('Nombre proyecto', 'Nombre titular', 'Funcionario visitador', 'Dirección'),
      );
      expect(obligatorios.has('nombre proyecto')).toBe(true);
      expect(obligatorios.has('propietario')).toBe(false);
    });

    it('respeta el tipo explícito', () => {
      const obligatorios = resolverNombresObligatorios(nombres('Propietario'), 'posterior');
      expect(obligatorios.has('propietario')).toBe(false);
      expect(obligatorios.has('npn')).toBe(true);
    });

    it('sin coincidencias no marca obligatorios', () => {
      expect(resolverNombresObligatorios(nombres('Otro campo')).size).toBe(0);
    });

    it('en empate usa la unión de ambos tipos', () => {
      const obligatorios = resolverNombresObligatorios(nombres('Dirección'));
      expect(obligatorios.has('propietario')).toBe(true);
      expect(obligatorios.has('nombre proyecto')).toBe(true);
    });
  });

  it('esMarcaRequerido interpreta los formatos del API', () => {
    expect([true, 1, '1', 'true', 'SI', 'sí'].every(esMarcaRequerido)).toBe(true);
    expect([false, 0, '0', 'no', '', null, undefined, {}].some(esMarcaRequerido)).toBe(false);
  });

  it('tipoControlDesdeTexto reconoce el tipo de visita', () => {
    expect(tipoControlDesdeTexto('Visita de Control Preventivo')).toBe('preventivo');
    expect(tipoControlDesdeTexto(null, 'CONTROL_POSTERIOR')).toBe('posterior');
    expect(tipoControlDesdeTexto('Queja', null)).toBeNull();
  });
});
