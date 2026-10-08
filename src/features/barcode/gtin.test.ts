import { describe, expect, it } from '@jest/globals';

import { expandUpcE, gs1CheckDigit, isValidGtin, normalizeGtin, parseBarcodeParam } from './gtin';

describe('gs1CheckDigit / isValidGtin', () => {
  it('EAN-13, EAN-8 y UPC-A válidos', () => {
    expect(isValidGtin('4006381333931')).toBe(true); // EAN-13
    expect(isValidGtin('96385074')).toBe(true); // EAN-8
    expect(isValidGtin('036000291452')).toBe(true); // UPC-A
    expect(gs1CheckDigit('400638133393')).toBe(1);
  });

  it('rechaza dígito verificador incorrecto, letras y largos no soportados', () => {
    expect(isValidGtin('4006381333932')).toBe(false);
    expect(isValidGtin('96385075')).toBe(false);
    expect(isValidGtin('40063813339A1')).toBe(false);
    expect(isValidGtin('12345')).toBe(false);
    expect(isValidGtin('00036000291452')).toBe(false); // 14 dígitos
    expect(isValidGtin('')).toBe(false);
  });
});

describe('expandUpcE', () => {
  it('último dígito 0–2', () => {
    expect(expandUpcE('04252614')).toBe('042100005264');
  });
  it('último dígito 3', () => {
    expect(expandUpcE('01234531')).toBe('012300000451');
  });
  it('último dígito 4', () => {
    expect(expandUpcE('01234543')).toBe('012340000053');
  });
  it('último dígito 5–9', () => {
    expect(expandUpcE('01234572')).toBe('012345000072');
  });
  it('rechaza verificador incorrecto o sistema de numeración distinto de 0/1', () => {
    expect(expandUpcE('04252615')).toBeNull();
    expect(expandUpcE('24252614')).toBeNull();
    expect(expandUpcE('0425261')).toBeNull();
  });
});

describe('normalizeGtin', () => {
  it('UPC-A y su EAN-13 equivalente dan el mismo GTIN', () => {
    expect(normalizeGtin('036000291452')).toBe('0036000291452');
    expect(normalizeGtin('0036000291452')).toBe('0036000291452');
  });

  it('UPC-E leído por la cámara y su UPC-A dan el mismo GTIN', () => {
    expect(normalizeGtin('04252614', 'upc_e')).toBe('0042100005264');
    expect(normalizeGtin('042100005264')).toBe('0042100005264');
  });

  it('EAN-8 se mantiene; un UPC-E escrito a mano se expande', () => {
    expect(normalizeGtin('96385074')).toBe('96385074');
    expect(normalizeGtin('04252614')).toBe('0042100005264');
  });

  it('quita espacios y rechaza códigos inválidos', () => {
    expect(normalizeGtin(' 4006381 333931 ')).toBe('4006381333931');
    expect(normalizeGtin('4006381333932')).toBeNull();
    expect(normalizeGtin('abc')).toBeNull();
    expect(normalizeGtin('123')).toBeNull();
  });
});

describe('parseBarcodeParam', () => {
  it('solo acepta GTIN canónicos', () => {
    expect(parseBarcodeParam('4006381333931')).toBe('4006381333931');
    expect(parseBarcodeParam('96385074')).toBe('96385074');
    expect(parseBarcodeParam('036000291452')).toBeUndefined(); // UPC-A sin normalizar
    expect(parseBarcodeParam('4006381333932')).toBeUndefined();
    expect(parseBarcodeParam(undefined)).toBeUndefined();
    expect(parseBarcodeParam(['4006381333931'])).toBeUndefined();
  });
});
