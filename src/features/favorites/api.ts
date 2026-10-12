import { foodKey } from '@/features/foods/key';
import type { FoodRef, FoodSource } from '@/features/foods/types';
import { supabase } from '@/lib/supabase';

// Spec 004 · R2: alimentos favoritos (tabla `favorite_foods`).

/** Fila de `public.favorite_foods`. */
export type FavoriteRow = {
  id: string;
  user_id: string;
  food_key: string;
  food_source: FoodSource;
  food_id: string | null;
  external_id: string | null;
  food_name: string;
  food_brand: string | null;
  kcal_100g: number;
  protein_100g: number;
  carbs_100g: number;
  fat_100g: number;
  created_at: string;
};

export type Favorite = { key: string; food: FoodRef };

export function favoriteFromRow(row: FavoriteRow): Favorite {
  return {
    key: row.food_key,
    food: {
      source: row.food_source,
      id: row.food_id ?? undefined,
      externalId: row.external_id ?? undefined,
      name: row.food_name,
      brand: row.food_brand,
      per100g: {
        kcal: Number(row.kcal_100g),
        protein: Number(row.protein_100g),
        carbs: Number(row.carbs_100g),
        fat: Number(row.fat_100g),
      },
    },
  };
}

/** Copia del alimento para guardarlo como favorito (R2.4). */
export function favoriteToInsert(food: FoodRef) {
  return {
    food_key: foodKey(food),
    food_source: food.source,
    food_id: food.source === 'off' ? null : (food.id ?? null),
    external_id: food.externalId ?? null,
    food_name: food.name,
    food_brand: food.brand ?? null,
    kcal_100g: food.per100g.kcal,
    protein_100g: food.per100g.protein,
    carbs_100g: food.per100g.carbs,
    fat_100g: food.per100g.fat,
  } satisfies Partial<FavoriteRow>;
}

/** Favoritos en orden alfabético (R2.2). */
export function sortFavorites(favorites: readonly Favorite[]): Favorite[] {
  return [...favorites].sort((a, b) => a.food.name.localeCompare(b.food.name, 'es', { sensitivity: 'base' }));
}

export async function fetchFavorites(): Promise<Favorite[]> {
  const { data, error } = await supabase.from('favorite_foods').select('*');
  if (error) throw error;
  return sortFavorites((data as FavoriteRow[]).map(favoriteFromRow));
}

const UNIQUE_VIOLATION = '23505';

/** Marca un favorito; si ya existía (doble toque, otro dispositivo) se considera hecho. */
export async function addFavorite(food: FoodRef): Promise<void> {
  const { error } = await supabase.from('favorite_foods').insert(favoriteToInsert(food));
  if (error && error.code !== UNIQUE_VIOLATION) throw error;
}

export async function removeFavorite(key: string): Promise<void> {
  const { error } = await supabase.from('favorite_foods').delete().eq('food_key', key);
  if (error) throw error;
}
