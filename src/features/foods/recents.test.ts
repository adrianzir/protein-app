import { describe, expect, it } from '@jest/globals';

import { lastGramsFor, pickRecents } from './recents';
import type { FoodRef } from './types';

const food = (id: string, kcal = 100): FoodRef => ({
  source: 'catalog',
  id,
  name: `Alimento ${id}`,
  brand: null,
  per100g: { kcal, protein: 1, carbs: 1, fat: 1 },
});

describe('pickRecents', () => {
  it('conserva el registro más reciente de cada alimento, en orden', () => {
    const recents = pickRecents([
      { food: food('a', 120), grams: 150 },
      { food: food('b'), grams: 30 },
      { food: food('a', 100), grams: 200 },
      { food: food('c'), grams: 80 },
    ]);
    expect(recents.map((r) => r.key)).toEqual(['catalog:a', 'catalog:b', 'catalog:c']);
    expect(recents[0]).toMatchObject({ lastGrams: 150, food: { per100g: { kcal: 120 } } });
  });

  it('respeta el límite', () => {
    const entries = Array.from({ length: 30 }, (_, i) => ({ food: food(String(i)), grams: 100 }));
    expect(pickRecents(entries)).toHaveLength(20);
    expect(pickRecents(entries, 5).map((r) => r.key)).toEqual(['0', '1', '2', '3', '4'].map((i) => `catalog:${i}`));
  });

  it('sin registros no hay recientes', () => {
    expect(pickRecents([])).toEqual([]);
  });
});

describe('lastGramsFor', () => {
  it('devuelve los gramos de la última vez o undefined', () => {
    const recents = pickRecents([{ food: food('a'), grams: 150 }]);
    expect(lastGramsFor('catalog:a', recents)).toBe(150);
    expect(lastGramsFor('catalog:z', recents)).toBeUndefined();
  });
});
