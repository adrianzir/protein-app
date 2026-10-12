import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import type { FoodRef } from '@/features/foods/types';

import { addFavorite, favoriteFromRow, favoriteToInsert, removeFavorite, sortFavorites, type FavoriteRow } from './api';

type Result = { error: { code?: string; message: string } | null };
const mockCalls: { method: string; args: unknown[] }[] = [];
let mockResult: Result = { error: null };

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => {
      mockCalls.push({ method: 'from', args });
      const builder = {
        insert: (...a: unknown[]) => {
          mockCalls.push({ method: 'insert', args: a });
          return Promise.resolve(mockResult);
        },
        delete: () => ({
          eq: (...a: unknown[]) => {
            mockCalls.push({ method: 'delete.eq', args: a });
            return Promise.resolve(mockResult);
          },
        }),
      };
      return builder;
    },
  },
}));

const offFood: FoodRef = {
  source: 'off',
  externalId: '7802800716500',
  name: 'Yogur batido frutilla',
  brand: 'Soprole',
  per100g: { kcal: 95, protein: 3.2, carbs: 15, fat: 2.5 },
};
const catalogFood: FoodRef = {
  source: 'catalog',
  id: 'c1',
  name: 'Palta',
  brand: null,
  per100g: { kcal: 160, protein: 2, carbs: 8.5, fat: 14.7 },
};

const asRow = (insert: ReturnType<typeof favoriteToInsert>): FavoriteRow => ({
  ...insert,
  id: 'f1',
  user_id: 'u1',
  created_at: '2026-10-10T12:00:00Z',
});

beforeEach(() => {
  mockCalls.length = 0;
  mockResult = { error: null };
});

describe('favoriteToInsert / favoriteFromRow', () => {
  it('guarda una copia del alimento y la recupera igual (R2.4)', () => {
    for (const food of [offFood, catalogFood]) {
      const fav = favoriteFromRow(asRow(favoriteToInsert(food)));
      expect(fav.food).toEqual(food);
    }
    expect(favoriteToInsert(offFood)).toMatchObject({ food_key: 'off:7802800716500', food_id: null });
    expect(favoriteToInsert(catalogFood)).toMatchObject({ food_key: 'catalog:c1', food_id: 'c1', external_id: null });
  });

  it('convierte los numeric que Supabase devuelve como texto', () => {
    const row = { ...asRow(favoriteToInsert(catalogFood)), kcal_100g: '160.0' as unknown as number };
    expect(favoriteFromRow(row).food.per100g.kcal).toBe(160);
  });
});

describe('sortFavorites', () => {
  it('ordena alfabéticamente en español, sin distinguir tildes ni mayúsculas', () => {
    const names = ['pan', 'Ñoquis', 'Arroz', 'ácido fólico', 'naranja'];
    const favs = names.map((name, i) => ({ key: String(i), food: { ...catalogFood, name } }));
    expect(sortFavorites(favs).map((f) => f.food.name)).toEqual(['ácido fólico', 'Arroz', 'naranja', 'Ñoquis', 'pan']);
  });
});

describe('addFavorite / removeFavorite', () => {
  it('inserta la copia del alimento', async () => {
    await addFavorite(offFood);
    expect(mockCalls).toEqual([
      { method: 'from', args: ['favorite_foods'] },
      { method: 'insert', args: [favoriteToInsert(offFood)] },
    ]);
  });

  it('un favorito que ya existía (23505) cuenta como marcado', async () => {
    mockResult = { error: { code: '23505', message: 'duplicate key' } };
    await expect(addFavorite(offFood)).resolves.toBeUndefined();
  });

  it('otros errores se propagan', async () => {
    mockResult = { error: { code: '42501', message: 'permiso denegado' } };
    await expect(addFavorite(offFood)).rejects.toMatchObject({ code: '42501' });
  });

  it('quita por clave del alimento', async () => {
    await removeFavorite('catalog:c1');
    expect(mockCalls).toContainEqual({ method: 'delete.eq', args: ['food_key', 'catalog:c1'] });
  });
});
