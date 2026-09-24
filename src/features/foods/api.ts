import { supabase } from '@/lib/supabase';
import { normalizeSearch } from '@/lib/text';

import type { FoodRef } from './types';
import type { CustomFoodInput } from './validation';

export const LOCAL_SEARCH_LIMIT = 20;
export const MIN_QUERY_LENGTH = 2;

/** Fila de `public.foods`. */
export type FoodRow = {
  id: string;
  owner_id: string | null;
  source: 'catalog' | 'custom';
  slug: string | null;
  name: string;
  brand: string | null;
  aliases: string[];
  kcal_100g: number;
  protein_100g: number;
  carbs_100g: number;
  fat_100g: number;
};

export function foodFromRow(row: FoodRow): FoodRef {
  return {
    source: row.source,
    id: row.id,
    name: row.name,
    brand: row.brand,
    per100g: {
      kcal: Number(row.kcal_100g),
      protein: Number(row.protein_100g),
      carbs: Number(row.carbs_100g),
      fat: Number(row.fat_100g),
    },
  };
}

/**
 * Un patrón ILIKE por palabra (todas deben aparecer, en cualquier orden): "pan molde" encuentra
 * "pan de molde". Se escapan los comodines de LIKE para buscar el texto literal.
 */
export function buildSearchPatterns(query: string): string[] {
  return normalizeSearch(query)
    .split(' ')
    .filter(Boolean)
    .map((word) => `%${word.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
}

/** Busca en el catálogo y en los alimentos propios (RLS filtra los de otros usuarios). */
export async function searchLocalFoods(query: string): Promise<FoodRef[]> {
  const patterns = buildSearchPatterns(query);
  if (patterns.length === 0) return [];

  let request = supabase.from('foods').select('*');
  for (const pattern of patterns) request = request.ilike('search_name', pattern);
  const { data, error } = await request
    .order('source', { ascending: false }) // 'custom' antes que 'catalog'
    .order('name')
    .limit(LOCAL_SEARCH_LIMIT);
  if (error) throw error;
  return (data as FoodRow[]).map(foodFromRow);
}

export async function createCustomFood(userId: string, input: CustomFoodInput): Promise<FoodRef> {
  const { data, error } = await supabase
    .from('foods')
    .insert({
      owner_id: userId,
      source: 'custom',
      name: input.name,
      brand: input.brand,
      kcal_100g: input.per100g.kcal,
      protein_100g: input.per100g.protein,
      carbs_100g: input.per100g.carbs,
      fat_100g: input.per100g.fat,
    })
    .select('*')
    .single();
  if (error) throw error;
  return foodFromRow(data as FoodRow);
}
