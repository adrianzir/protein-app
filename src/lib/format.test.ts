import { describe, expect, it } from '@jest/globals';

import { decimalToText, formatGrams, formatInt, parseDecimal } from './format';

describe('parseDecimal', () => {
  it('acepta coma o punto decimal', () => {
    expect(parseDecimal('12,5')).toBe(12.5);
    expect(parseDecimal('12.5')).toBe(12.5);
    expect(parseDecimal(' 150 ')).toBe(150);
    expect(parseDecimal('0,5')).toBe(0.5);
    expect(parseDecimal(',5')).toBe(0.5);
    expect(parseDecimal('12,')).toBe(12);
  });

  it('rechaza vacío y texto no numérico', () => {
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal('abc')).toBeNull();
    expect(parseDecimal('1,2,3')).toBeNull();
    expect(parseDecimal('-5')).toBeNull();
    expect(parseDecimal('1e3')).toBeNull();
  });
});

describe('formatGrams / formatInt / decimalToText', () => {
  it('formatea', () => {
    expect(formatGrams(150)).toBe('150');
    expect(formatGrams(12.25)).toBe('12.3');
    expect(formatGrams(0.04)).toBe('0');
    expect(formatInt(133.5)).toBe('134');
    expect(decimalToText(null)).toBe('');
    expect(decimalToText(80.5)).toBe('80.5');
  });
});
