import { describe, expect, it } from '@jest/globals';

import { addDays, formatDayLabel, isFuture, isValidISODate, toLocalISODate } from './date';

describe('toLocalISODate', () => {
  it('usa la fecha local, no UTC: 23:30 sigue siendo el mismo día', () => {
    expect(toLocalISODate(new Date(2026, 8, 24, 23, 30))).toBe('2026-09-24');
    expect(toLocalISODate(new Date(2026, 8, 24, 0, 5))).toBe('2026-09-24');
  });
});

describe('addDays', () => {
  it('cruza meses y años', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('no se salta días en cambios de horario (Chile, abril y septiembre)', () => {
    expect(addDays('2026-04-04', 1)).toBe('2026-04-05');
    expect(addDays('2026-09-05', 1)).toBe('2026-09-06');
    expect(addDays('2026-09-06', -1)).toBe('2026-09-05');
  });
});

describe('isFuture', () => {
  it('compara contra hoy', () => {
    expect(isFuture('2026-09-25', '2026-09-24')).toBe(true);
    expect(isFuture('2026-09-24', '2026-09-24')).toBe(false);
    expect(isFuture('2025-12-31', '2026-09-24')).toBe(false);
  });
});

describe('isValidISODate', () => {
  it('valida formato y fechas reales', () => {
    expect(isValidISODate('2026-09-24')).toBe(true);
    expect(isValidISODate('2026-02-30')).toBe(false);
    expect(isValidISODate('24-09-2026')).toBe(false);
  });
});

describe('formatDayLabel', () => {
  const today = '2026-09-24';

  it('muestra Hoy y Ayer', () => {
    expect(formatDayLabel('2026-09-24', today)).toBe('Hoy');
    expect(formatDayLabel('2026-09-23', today)).toBe('Ayer');
  });

  it('muestra día de la semana, día y mes', () => {
    expect(formatDayLabel('2026-09-21', today)).toBe('lun 21 sep');
  });

  it('agrega el año si no es el actual', () => {
    expect(formatDayLabel('2025-12-31', today)).toBe('mié 31 dic 2025');
  });
});
