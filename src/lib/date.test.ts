import { describe, expect, it } from '@jest/globals';

import {
  addDays,
  formatDayLabel,
  formatDayLong,
  formatPeriodLabel,
  formatWeekdayShort,
  isFuture,
  isValidISODate,
  toLocalISODate,
} from './date';

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

describe('formatos de Progreso (Spec 004)', () => {
  const today = '2026-10-09';
  it('día de la semana abreviado', () => {
    expect(formatWeekdayShort('2026-10-09')).toBe('vie');
    expect(formatWeekdayShort('2026-10-05')).toBe('lun');
  });
  it('fecha completa, con año si no es el actual', () => {
    expect(formatDayLong('2026-10-09', today)).toBe('viernes 9 de octubre');
    expect(formatDayLong('2025-12-31', today)).toBe('miércoles 31 de diciembre de 2025');
  });
  it('rango en el mismo mes, entre meses y entre años', () => {
    expect(formatPeriodLabel('2026-10-03', '2026-10-09', today)).toBe('3–9 oct');
    expect(formatPeriodLabel('2026-09-28', '2026-10-04', today)).toBe('28 sep – 4 oct');
    expect(formatPeriodLabel('2025-12-29', '2026-01-04', today)).toBe('29 dic 2025 – 4 ene 2026');
    expect(formatPeriodLabel('2025-06-01', '2025-06-07', today)).toBe('1 jun 2025 – 7 jun 2025');
  });
});
