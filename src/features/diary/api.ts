import type { FoodRef, FoodSource } from '@/features/foods/types';
import type { ISODate } from '@/lib/date';
import { supabase } from '@/lib/supabase';

import type { Macros, MealType } from './macros';

/** Fila de `public.food_logs` (kcal, protein_g, carbs_g y fat_g son columnas generadas). */
export type FoodLogRow = {
  id: string;
  user_id: string;
  eaten_on: ISODate;
  meal_type: MealType;
  food_id: string | null;
  food_source: FoodSource;
  external_id: string | null;
  food_name: string;
  food_brand: string | null;
  grams: number;
  kcal_100g: number;
  protein_100g: number;
  carbs_100g: number;
  fat_100g: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  created_at: string;
};

export type DiaryEntry = Macros & {
  id: string;
  eatenOn: ISODate;
  mealType: MealType;
  grams: number;
  food: FoodRef;
};

export type NewDiaryEntry = {
  eatenOn: ISODate;
  mealType: MealType;
  grams: number;
  food: FoodRef;
};

export type DiaryEntryPatch = { grams: number; mealType: MealType };

/** La columna es numeric(6,1). */
export const roundGrams = (g: number) => Math.round(g * 10) / 10;

export function entryFromRow(row: FoodLogRow): DiaryEntry {
  return {
    id: row.id,
    eatenOn: row.eaten_on,
    mealType: row.meal_type,
    grams: Number(row.grams),
    kcal: Number(row.kcal),
    proteinG: Number(row.protein_g),
    carbsG: Number(row.carbs_g),
    fatG: Number(row.fat_g),
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

/** Copia del alimento al momento de registrar (R5.4). */
export function entryToInsert(entry: NewDiaryEntry) {
  const { food } = entry;
  return {
    eaten_on: entry.eatenOn,
    meal_type: entry.mealType,
    grams: roundGrams(entry.grams),
    food_id: food.source === 'off' ? null : (food.id ?? null),
    food_source: food.source,
    external_id: food.externalId ?? null,
    food_name: food.name,
    food_brand: food.brand ?? null,
    kcal_100g: food.per100g.kcal,
    protein_100g: food.per100g.protein,
    carbs_100g: food.per100g.carbs,
    fat_100g: food.per100g.fat,
  } satisfies Partial<FoodLogRow>;
}

export async function fetchDayEntries(date: ISODate): Promise<DiaryEntry[]> {
  const { data, error } = await supabase
    .from('food_logs')
    .select('*')
    .eq('eaten_on', date)
    .order('created_at');
  if (error) throw error;
  return (data as FoodLogRow[]).map(entryFromRow);
}

export async function fetchEntry(id: string): Promise<DiaryEntry | null> {
  const { data, error } = await supabase.from('food_logs').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? entryFromRow(data as FoodLogRow) : null;
}

export async function addEntry(entry: NewDiaryEntry): Promise<DiaryEntry> {
  const { data, error } = await supabase.from('food_logs').insert(entryToInsert(entry)).select('*').single();
  if (error) throw error;
  return entryFromRow(data as FoodLogRow);
}

export async function updateEntry(id: string, patch: DiaryEntryPatch): Promise<DiaryEntry> {
  const { data, error } = await supabase
    .from('food_logs')
    .update({ grams: roundGrams(patch.grams), meal_type: patch.mealType })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return entryFromRow(data as FoodLogRow);
}

export async function deleteEntry(id: string): Promise<void> {
  const { error } = await supabase.from('food_logs').delete().eq('id', id);
  if (error) throw error;
}
