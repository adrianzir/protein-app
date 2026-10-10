import type { FoodRef, FoodSource } from '@/features/foods/types';
import type { DayRow } from '@/features/progress/stats';
import type { ISODate } from '@/lib/date';
import { supabase } from '@/lib/supabase';

import { roundGrams, type Macros, type MealType } from './macros';

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

export { roundGrams } from './macros';

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

/** Registros desde `since` (incluido), del más nuevo al más antiguo, para Recientes (Spec 004 · R1). */
export const RECENT_ROWS_LIMIT = 300;

export async function fetchRecentEntries(since: ISODate): Promise<DiaryEntry[]> {
  const { data, error } = await supabase
    .from('food_logs')
    .select('*')
    .gte('eaten_on', since)
    .order('created_at', { ascending: false })
    .limit(RECENT_ROWS_LIMIT);
  if (error) throw error;
  return (data as FoodLogRow[]).map(entryFromRow);
}

type RangeRow = Pick<FoodLogRow, 'eaten_on' | 'kcal' | 'protein_g' | 'carbs_g' | 'fat_g'>;

export function dayRowFromRow(row: RangeRow): DayRow {
  return {
    eatenOn: row.eaten_on,
    kcal: Number(row.kcal),
    proteinG: Number(row.protein_g),
    carbsG: Number(row.carbs_g),
    fatG: Number(row.fat_g),
  };
}

/** Macros de cada registro entre `from` y `to` (incluidos), en una sola consulta (Spec 004 · R5.2). */
export async function fetchRangeRows(from: ISODate, to: ISODate): Promise<DayRow[]> {
  const { data, error } = await supabase
    .from('food_logs')
    .select('eaten_on, kcal, protein_g, carbs_g, fat_g')
    .gte('eaten_on', from)
    .lte('eaten_on', to);
  if (error) throw error;
  return (data as RangeRow[]).map(dayRowFromRow);
}

/** Copias de registros para otro día y tipo de comida: mismo alimento, gramos y valores (Spec 004 · R3.3). */
export function copiesOf(entries: readonly DiaryEntry[], eatenOn: ISODate, mealType: MealType): NewDiaryEntry[] {
  return entries.map(({ grams, food }) => ({ eatenOn, mealType, grams, food }));
}

/** Un solo insert: Postgres guarda todas las filas o ninguna (Spec 004 · R3.3). */
export async function addEntries(entries: readonly NewDiaryEntry[]): Promise<DiaryEntry[]> {
  if (entries.length === 0) return [];
  const { data, error } = await supabase.from('food_logs').insert(entries.map(entryToInsert)).select('*');
  if (error) throw error;
  return (data as FoodLogRow[]).map(entryFromRow);
}
