import { fechaParaInput, fechaParaSaul, horaParaInput, horaParaSaul } from './fecha-hora-visita';

describe('fecha-hora-visita', () => {
  it.each([
    ['2026-10-20', '2026-10-20'],
    ['10/20/2026', '2026-10-20'],
    ['1/5/2026', '2026-01-05'],
    ['', ''],
    [null, ''],
    ['no es fecha', ''],
  ])('fechaParaInput(%j) → %j', (entrada, esperado) => {
    expect(fechaParaInput(entrada)).toBe(esperado);
  });

  it.each([
    ['14:30', '14:30'],
    ['9:05:00', '09:05'],
    ['1/1/1970, 2:30:00 PM', '14:30'],
    ['1/1/1970, 12:15:00 AM', '00:15'],
    ['1/1/1970, 12:15:00 PM', '12:15'],
    ['', ''],
    [null, ''],
  ])('horaParaInput(%j) → %j', (entrada, esperado) => {
    expect(horaParaInput(entrada)).toBe(esperado);
  });

  it('envía la fecha elegida sin correrse un día', () => {
    expect(fechaParaSaul('2026-10-20')).toBe('10/20/2026');
    expect(fechaParaSaul('2026-01-01')).toBe('1/1/2026');
    expect(fechaParaSaul(null)).toBe(null);
  });

  it('envía la hora como el input time de SAUL (1/1/1970 en Bogotá)', () => {
    expect(horaParaSaul('14:30')).toBe('1/1/1970, 2:30:00 PM');
    expect(horaParaSaul('00:05')).toBe('1/1/1970, 12:05:00 AM');
    expect(horaParaSaul(null)).toBe(null);
  });

  it('ida y vuelta: lo que se envía se vuelve a mostrar igual en el input', () => {
    expect(fechaParaInput(fechaParaSaul('2026-10-20'))).toBe('2026-10-20');
    expect(horaParaInput(horaParaSaul('18:45'))).toBe('18:45');
  });
});
