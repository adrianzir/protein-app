import { describe, expect, it, jest } from '@jest/globals';

import { OffError, type OffProductResult } from '@/features/foods/openFoodFacts';
import type { FoodRef } from '@/features/foods/types';

import { lookupBarcode } from './lookup';

const GTIN = '7802800716500';
const own: FoodRef = {
  source: 'custom',
  id: 'f1',
  name: 'Yogur casero',
  per100g: { kcal: 90, protein: 3, carbs: 14, fat: 2 },
};
const offFood: FoodRef = { ...own, source: 'off', id: undefined, externalId: GTIN, name: 'Yogur OFF' };

const offFound = async (): Promise<OffProductResult> => ({ kind: 'found', food: offFood });

describe('lookupBarcode', () => {
  it('alimento propio encontrado → no consulta OFF (R3.1)', async () => {
    const fetchProduct = jest.fn(offFound);
    const r = await lookupBarcode(GTIN, { findOwn: async () => own, fetchProduct });
    expect(r).toEqual({ kind: 'found', food: own, origin: 'own' });
    expect(fetchProduct).not.toHaveBeenCalled();
  });

  it('sin alimento propio → resultado de OFF', async () => {
    const r = await lookupBarcode(GTIN, { findOwn: async () => null, fetchProduct: offFound });
    expect(r).toEqual({ kind: 'found', food: offFood, origin: 'off' });
  });

  it('error al leer los propios → sigue con OFF y avisa', async () => {
    const warn = jest.fn();
    const r = await lookupBarcode(GTIN, {
      findOwn: async () => {
        throw new Error('supabase caído');
      },
      fetchProduct: offFound,
      warn,
    });
    expect(r.kind).toBe('found');
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('not_found e incompleto de OFF se devuelven tal cual', async () => {
    await expect(
      lookupBarcode(GTIN, { findOwn: async () => null, fetchProduct: async () => ({ kind: 'not_found' }) }),
    ).resolves.toEqual({ kind: 'not_found' });
    const partial = { name: 'X', brand: null, per100g: { kcal: 100 } };
    await expect(
      lookupBarcode(GTIN, { findOwn: async () => null, fetchProduct: async () => ({ kind: 'incomplete', partial }) }),
    ).resolves.toEqual({ kind: 'incomplete', partial });
  });

  it('error de red de OFF se propaga (R6.1)', async () => {
    const fetchProduct = async (): Promise<OffProductResult> => {
      throw new OffError('sin red', 'network');
    };
    await expect(lookupBarcode(GTIN, { findOwn: async () => null, fetchProduct })).rejects.toMatchObject({
      reason: 'network',
    });
  });
});
