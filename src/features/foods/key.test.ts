import { describe, expect, it, jest } from '@jest/globals';

import { entryFromRow, type FoodLogRow } from '@/features/diary/api';

import { foodKey } from './key';
import type { FoodRef } from './types';

// El cliente real exige variables de entorno; aquí solo se usa el mapeo de filas.
jest.mock('@/lib/supabase', () => ({ supabase: {} }));

const per100g = { kcal: 100, protein: 1, carbs: 1, fat: 1 };

describe('foodKey', () => {
  it('usa el id para catálogo y alimentos propios', () => {
    expect(foodKey({ source: 'catalog', id: 'c1', name: 'Palta' })).toBe('catalog:c1');
    expect(foodKey({ source: 'custom', id: 'u1', name: 'Queque' })).toBe('custom:u1');
  });

  it('usa el código de barras para Open Food Facts', () => {
    expect(foodKey({ source: 'off', externalId: '7802800716500', name: 'Yogur' })).toBe('off:7802800716500');
  });

  it('sin id usa el nombre normalizado', () => {
    expect(foodKey({ source: 'custom', name: '  Quéque de la  Abuela ' })).toBe('custom:name:queque de la abuela');
    expect(foodKey({ source: 'off', name: 'Yogur' })).toBe('off:name:yogur');
  });

  it('un registro y un resultado de búsqueda del mismo alimento dan la misma clave', () => {
    const fromSearch: FoodRef = { source: 'catalog', id: 'c1', name: 'Palta', brand: null, per100g };
    const row: FoodLogRow = {
      id: 'l1', user_id: 'u', eaten_on: '2026-10-09', meal_type: 'lunch', food_id: 'c1', food_source: 'catalog',
      external_id: null, food_name: 'Palta', food_brand: null, grams: 80, kcal_100g: 100, protein_100g: 1,
      carbs_100g: 1, fat_100g: 1, kcal: 80, protein_g: 0.8, carbs_g: 0.8, fat_g: 0.8, created_at: '2026-10-09T12:00:00Z',
    };
    expect(foodKey(entryFromRow(row).food)).toBe(foodKey(fromSearch));

    const offRow = { ...row, food_id: null, food_source: 'off' as const, external_id: '7802800716500' };
    expect(foodKey(entryFromRow(offRow).food)).toBe('off:7802800716500');
  });
});
