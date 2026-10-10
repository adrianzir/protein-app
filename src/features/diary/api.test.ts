import { describe, expect, it, jest } from '@jest/globals';

import type { FoodRef } from '@/features/foods/types';

import { addEntries, copiesOf, dayRowFromRow, entryFromRow, entryToInsert, roundGrams, type FoodLogRow } from './api';

// El cliente real exige variables de entorno; estos tests solo prueban los mapeos.
jest.mock('@/lib/supabase', () => ({ supabase: {} }));

const offFood: FoodRef = {
  source: 'off',
  externalId: '7802800716500',
  name: 'Yogur batido',
  brand: 'Soprole',
  per100g: { kcal: 95, protein: 3.2, carbs: 15.1, fat: 2.5 },
};

describe('entryToInsert', () => {
  it('copia los valores del alimento y redondea gramos (R5.4)', () => {
    expect(entryToInsert({ eatenOn: '2026-09-24', mealType: 'snack', grams: 125.04, food: offFood })).toEqual({
      eaten_on: '2026-09-24',
      meal_type: 'snack',
      grams: 125,
      food_id: null,
      food_source: 'off',
      external_id: '7802800716500',
      food_name: 'Yogur batido',
      food_brand: 'Soprole',
      kcal_100g: 95,
      protein_100g: 3.2,
      carbs_100g: 15.1,
      fat_100g: 2.5,
    });
  });

  it('guarda food_id para catálogo y personalizados', () => {
    const r = entryToInsert({
      eatenOn: '2026-09-24',
      mealType: 'lunch',
      grams: 100,
      food: { ...offFood, source: 'catalog', id: 'f1', externalId: undefined },
    });
    expect(r.food_id).toBe('f1');
    expect(r.external_id).toBeNull();
  });
});

describe('entryFromRow', () => {
  it('usa las columnas generadas y convierte numeric a number', () => {
    const row = {
      id: 'l1',
      user_id: 'u1',
      eaten_on: '2026-09-24',
      meal_type: 'breakfast',
      food_id: 'f1',
      food_source: 'catalog',
      external_id: null,
      food_name: 'Plátano',
      food_brand: null,
      grams: '150.0',
      kcal_100g: 89,
      protein_100g: 1.1,
      carbs_100g: 22.8,
      fat_100g: 0.3,
      kcal: '133.5',
      protein_g: 1.65,
      carbs_g: 34.2,
      fat_g: 0.45,
      created_at: '2026-09-24T12:00:00Z',
    } as unknown as FoodLogRow;
    const e = entryFromRow(row);
    expect(e).toMatchObject({ id: 'l1', grams: 150, kcal: 133.5, proteinG: 1.65, mealType: 'breakfast' });
    expect(e.food).toEqual({
      source: 'catalog',
      id: 'f1',
      externalId: undefined,
      name: 'Plátano',
      brand: null,
      per100g: { kcal: 89, protein: 1.1, carbs: 22.8, fat: 0.3 },
    });
  });
});

describe('roundGrams', () => {
  it('1 decimal', () => {
    expect(roundGrams(33.333)).toBe(33.3);
    expect(roundGrams(0.05)).toBe(0.1);
  });
});

describe('copiesOf (Spec 004 · R3.3)', () => {
  it('copia alimento, gramos y valores al nuevo día y tipo de comida', () => {
    const row: FoodLogRow = {
      id: 'l1', user_id: 'u', eaten_on: '2026-10-08', meal_type: 'lunch', food_id: null, food_source: 'off',
      external_id: '7802800716500', food_name: 'Yogur', food_brand: 'Soprole', grams: 155, kcal_100g: 95,
      protein_100g: 3.2, carbs_100g: 15, fat_100g: 2.5, kcal: 147.25, protein_g: 4.96, carbs_g: 23.25,
      fat_g: 3.875, created_at: '2026-10-08T13:00:00Z',
    };
    const yesterday = entryFromRow(row);
    const [copy] = copiesOf([yesterday], '2026-10-09', 'breakfast');
    expect(copy).toEqual({ eatenOn: '2026-10-09', mealType: 'breakfast', grams: 155, food: yesterday.food });
    expect(entryToInsert(copy)).toMatchObject({
      eaten_on: '2026-10-09', meal_type: 'breakfast', grams: 155, food_source: 'off',
      external_id: '7802800716500', food_name: 'Yogur', kcal_100g: 95,
    });
  });

  it('sin registros no se inserta nada', async () => {
    await expect(addEntries([])).resolves.toEqual([]);
  });
});

describe('dayRowFromRow', () => {
  it('convierte las columnas generadas (numeric como texto) a números', () => {
    expect(
      dayRowFromRow({ eaten_on: '2026-10-09', kcal: '147.25' as unknown as number, protein_g: 4.96, carbs_g: 23.25, fat_g: 3.875 }),
    ).toEqual({ eatenOn: '2026-10-09', kcal: 147.25, proteinG: 4.96, carbsG: 23.25, fatG: 3.875 });
  });
});
