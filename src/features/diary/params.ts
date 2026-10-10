import { isFuture, isValidISODate, toLocalISODate, type ISODate } from '@/lib/date';
import { parseDecimal } from '@/lib/format';

import { GRAMS_LIMITS, MEAL_TYPES, roundGrams, validateGrams, type MealType } from './macros';

/** Fecha de un parámetro de ruta; si falta, es inválida o futura, hoy (R5.5, R6.4). */
export function parseDateParam(raw: string | string[] | undefined, today: ISODate = toLocalISODate()): ISODate {
  return typeof raw === 'string' && isValidISODate(raw) && !isFuture(raw, today) ? raw : today;
}

/** Tipo de comida de un parámetro de ruta; si no es válido, `fallback`. */
export function parseMealParam(raw: string | string[] | undefined, fallback: MealType = 'snack'): MealType {
  return typeof raw === 'string' && (MEAL_TYPES as readonly string[]).includes(raw) ? (raw as MealType) : fallback;
}

/** Gramos iniciales de un parámetro de ruta (Spec 004 · R1.3, R2.3); si no son válidos, 100 g. */
export function parseGramsParam(raw: string | string[] | undefined): number {
  const parsed = typeof raw === 'string' ? parseDecimal(raw) : null;
  // Se valida después de redondear: 0.04 g se guardaría como 0.
  const grams = parsed == null ? null : roundGrams(parsed);
  return grams != null && !validateGrams(grams) ? grams : GRAMS_LIMITS.default;
}
