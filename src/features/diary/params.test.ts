import { describe, expect, it } from '@jest/globals';

import { parseDateParam, parseGramsParam, parseMealParam } from './params';

describe('parseDateParam', () => {
  const today = '2026-09-28';
  it('acepta fechas pasadas válidas', () => {
    expect(parseDateParam('2026-09-20', today)).toBe('2026-09-20');
  });
  it('futura, inválida o ausente → hoy', () => {
    expect(parseDateParam('2026-09-29', today)).toBe(today);
    expect(parseDateParam('2026-02-30', today)).toBe(today);
    expect(parseDateParam(undefined, today)).toBe(today);
    expect(parseDateParam(['2026-09-20'], today)).toBe(today);
  });
});

describe('parseMealParam', () => {
  it('acepta tipos válidos y usa el valor por defecto si no', () => {
    expect(parseMealParam('dinner')).toBe('dinner');
    expect(parseMealParam('once')).toBe('snack');
    expect(parseMealParam(undefined, 'lunch')).toBe('lunch');
  });
});

describe('parseGramsParam', () => {
  it('acepta cantidades válidas, con coma decimal, redondeadas a 1 decimal', () => {
    expect(parseGramsParam('150')).toBe(150);
    expect(parseGramsParam('37,5')).toBe(37.5);
    expect(parseGramsParam('12.34')).toBe(12.3);
    expect(parseGramsParam('5000')).toBe(5000);
  });
  it('vacío, texto, 0, negativo, > 5000 o ausente → 100 g', () => {
    for (const raw of ['', 'abc', '0', '0.04', '-5', '5000.1', undefined, ['150']]) {
      expect(parseGramsParam(raw)).toBe(100);
    }
  });
});
