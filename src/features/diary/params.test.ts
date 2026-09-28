import { describe, expect, it } from '@jest/globals';

import { parseDateParam, parseMealParam } from './params';

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
