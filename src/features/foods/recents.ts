import { foodKey } from './key';
import type { FoodRef } from './types';

// Spec 004 · R1: alimentos recientes.

export const RECENTS_LIMIT = 20;
export const RECENTS_DAYS = 30;

export type RecentFood = { key: string; food: FoodRef; lastGrams: number };

/**
 * Recientes a partir de registros ordenados del más nuevo al más antiguo:
 * conserva el primero de cada alimento, con sus valores y gramos (R1.1–R1.5).
 */
export function pickRecents(
  entries: readonly { food: FoodRef; grams: number }[],
  limit: number = RECENTS_LIMIT,
): RecentFood[] {
  const seen = new Set<string>();
  const recents: RecentFood[] = [];
  for (const { food, grams } of entries) {
    if (recents.length >= limit) break;
    const key = foodKey(food);
    if (seen.has(key)) continue;
    seen.add(key);
    recents.push({ key, food, lastGrams: grams });
  }
  return recents;
}

/** Gramos de la última vez que se registró el alimento, si está entre los recientes (R2.3). */
export function lastGramsFor(key: string, recents: readonly RecentFood[]): number | undefined {
  return recents.find((r) => r.key === key)?.lastGrams;
}
