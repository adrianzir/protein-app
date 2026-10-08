import { isFuture, isValidISODate, toLocalISODate, type ISODate } from '@/lib/date';

import { MEAL_TYPES, type MealType } from './macros';

/** Fecha de un parámetro de ruta; si falta, es inválida o futura, hoy (R5.5, R6.4). */
export function parseDateParam(raw: string | string[] | undefined, today: ISODate = toLocalISODate()): ISODate {
  return typeof raw === 'string' && isValidISODate(raw) && !isFuture(raw, today) ? raw : today;
}

/** Tipo de comida de un parámetro de ruta; si no es válido, `fallback`. */
export function parseMealParam(raw: string | string[] | undefined, fallback: MealType = 'snack'): MealType {
  return typeof raw === 'string' && (MEAL_TYPES as readonly string[]).includes(raw) ? (raw as MealType) : fallback;
}
