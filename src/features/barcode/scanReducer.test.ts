import { describe, expect, it } from '@jest/globals';

import type { FoodRef } from '@/features/foods/types';

import { initScanState, scanReducer, type ScanState } from './scanReducer';

const EAN = '4006381333931';
const food: FoodRef = { source: 'off', externalId: EAN, name: 'X', per100g: { kcal: 1, protein: 0, carbs: 0, fat: 0 } };
const scanning: ScanState = { status: 'scanning', mode: 'camera' };
const lookingUp: ScanState = { status: 'looking_up', mode: 'camera', gtin: EAN };

describe('initScanState', () => {
  it('web → manual (R7.2)', () => {
    expect(initScanState({ isWeb: true })).toEqual({ status: 'manual', mode: 'manual', invalid: false });
  });
  it('móvil según permiso (R2)', () => {
    expect(initScanState({ isWeb: false, permission: { granted: true, canAskAgain: true } }).status).toBe('scanning');
    expect(initScanState({ isWeb: false, permission: { granted: false, canAskAgain: false } }).status).toBe('denied');
    expect(initScanState({ isWeb: false, permission: { granted: false, canAskAgain: true } }).status).toBe('permission');
    expect(initScanState({ isWeb: false, permission: null }).status).toBe('permission');
  });
});

describe('permiso', () => {
  it('permission → scanning o denied; denied → scanning si luego se concede', () => {
    const p: ScanState = { status: 'permission', mode: 'camera' };
    expect(scanReducer(p, { type: 'PERMISSION_GRANTED' })).toEqual(scanning);
    const denied = scanReducer(p, { type: 'PERMISSION_DENIED' });
    expect(denied.status).toBe('denied');
    expect(scanReducer(denied, { type: 'PERMISSION_GRANTED' })).toEqual(scanning);
  });
});

describe('lectura de códigos', () => {
  it('código válido → looking_up con GTIN normalizado', () => {
    expect(scanReducer(scanning, { type: 'CODE_SCANNED', data: '036000291452', barcodeType: 'upc_a' })).toEqual({
      status: 'looking_up',
      mode: 'camera',
      gtin: '0036000291452',
    });
  });

  it('código inválido → sigue escaneando (R1.5)', () => {
    expect(scanReducer(scanning, { type: 'CODE_SCANNED', data: '4006381333932' })).toBe(scanning);
  });

  it('ignora un segundo código mientras busca (R1.3)', () => {
    expect(scanReducer(lookingUp, { type: 'CODE_SCANNED', data: '96385074' })).toBe(lookingUp);
  });

  it('manual: inválido marca error; válido busca (R5)', () => {
    const manual = initScanState({ isWeb: true });
    expect(scanReducer(manual, { type: 'MANUAL_SUBMIT', text: '123' })).toEqual({ ...manual, invalid: true });
    expect(scanReducer(manual, { type: 'MANUAL_SUBMIT', text: EAN })).toEqual({
      status: 'looking_up',
      mode: 'manual',
      gtin: EAN,
    });
  });

  it('GO_MANUAL desde escaneo, permiso negado o error', () => {
    expect(scanReducer(scanning, { type: 'GO_MANUAL' }).status).toBe('manual');
    expect(scanReducer({ status: 'denied', mode: 'camera' }, { type: 'GO_MANUAL' }).status).toBe('manual');
    expect(scanReducer({ status: 'error', mode: 'camera', gtin: EAN, message: 'x' }, { type: 'GO_MANUAL' }).status).toBe(
      'manual',
    );
  });
});

describe('resultado de la búsqueda', () => {
  it('found / incompleto / no existe', () => {
    expect(scanReducer(lookingUp, { type: 'LOOKUP_DONE', gtin: EAN, result: { kind: 'found', food, origin: 'off' } })).toEqual({
      status: 'found',
      mode: 'camera',
      gtin: EAN,
      food,
    });
    const partial = { name: 'Y', brand: null, per100g: {} };
    expect(scanReducer(lookingUp, { type: 'LOOKUP_DONE', gtin: EAN, result: { kind: 'incomplete', partial } })).toEqual({
      status: 'missing',
      mode: 'camera',
      gtin: EAN,
      reason: 'incomplete',
      partial,
    });
    expect(scanReducer(lookingUp, { type: 'LOOKUP_DONE', gtin: EAN, result: { kind: 'not_found' } })).toMatchObject({
      status: 'missing',
      reason: 'not_found',
    });
  });

  it('ignora respuestas de otro código (búsqueda cancelada)', () => {
    expect(scanReducer(lookingUp, { type: 'LOOKUP_DONE', gtin: '96385074', result: { kind: 'not_found' } })).toBe(lookingUp);
  });

  it('error → reintentar conserva el código (R6.1)', () => {
    const error = scanReducer(lookingUp, { type: 'LOOKUP_FAILED', gtin: EAN, message: 'sin red' });
    expect(error).toEqual({ status: 'error', mode: 'camera', gtin: EAN, message: 'sin red' });
    expect(scanReducer(error, { type: 'RETRY' })).toEqual(lookingUp);
  });

  it('cancelar y volver a escanear regresan al modo de captura (R3.4)', () => {
    expect(scanReducer(lookingUp, { type: 'CANCEL' })).toEqual(scanning);
    const manualLookup: ScanState = { status: 'looking_up', mode: 'manual', gtin: EAN };
    expect(scanReducer(manualLookup, { type: 'CANCEL' }).status).toBe('manual');
    const missing = scanReducer(lookingUp, { type: 'LOOKUP_DONE', gtin: EAN, result: { kind: 'not_found' } });
    expect(scanReducer(missing, { type: 'RESCAN' })).toEqual(scanning);
  });
});
