import type { ValidationResult } from '@/lib/validation';

import { FOOD_LIMITS, FOOD_SOURCES, type FoodRef, type NutrientsPer100g } from './types';

// Spec 001 · R4.2, R5.1

export type CustomFoodInput = {
  name: string;
  brand: string | null;
  per100g: NutrientsPer100g;
};

export type CustomFoodDraft = {
  name?: string;
  brand?: string | null;
  kcal?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
};

export type CustomFoodErrors = Partial<Record<keyof CustomFoodDraft | 'macros', string>>;

const isNonNegative = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;

/** Errores de coherencia de valores por 100 g (compartido por alimento propio y parámetros). */
export function nutrientErrors(n: Partial<Record<keyof NutrientsPer100g, unknown>>): CustomFoodErrors {
  const errors: CustomFoodErrors = {};
  for (const key of ['kcal', 'protein', 'carbs', 'fat'] as const) {
    if (!isNonNegative(n[key])) errors[key] = 'Ingresa un número mayor o igual a 0.';
  }
  if (!errors.kcal && (n.kcal as number) > FOOD_LIMITS.kcalMax) {
    errors.kcal = `Máximo ${FOOD_LIMITS.kcalMax} kcal por 100 g.`;
  }
  if (!errors.protein && !errors.carbs && !errors.fat) {
    const sum = (n.protein as number) + (n.carbs as number) + (n.fat as number);
    if (sum > FOOD_LIMITS.macrosSumMax) {
      errors.macros = 'Proteína + carbohidratos + grasas no puede superar 100 g por cada 100 g.';
    }
  }
  return errors;
}

export function validateCustomFood(
  draft: CustomFoodDraft,
): ValidationResult<CustomFoodInput, CustomFoodErrors> {
  const name = (draft.name ?? '').trim();
  const brand = (draft.brand ?? '').trim();
  const errors: CustomFoodErrors = nutrientErrors(draft);

  if (name.length === 0) errors.name = 'Ingresa un nombre.';
  else if (name.length > FOOD_LIMITS.nameMax) errors.name = `Máximo ${FOOD_LIMITS.nameMax} caracteres.`;
  if (brand.length > FOOD_LIMITS.brandMax) errors.brand = `Máximo ${FOOD_LIMITS.brandMax} caracteres.`;

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name,
      brand: brand || null,
      per100g: {
        kcal: draft.kcal as number,
        protein: draft.protein as number,
        carbs: draft.carbs as number,
        fat: draft.fat as number,
      },
    },
  };
}

/** Serializa un alimento para pasarlo como parámetro de ruta. */
export function encodeFoodParam(food: FoodRef): string {
  return JSON.stringify(food);
}

/** Lee y valida el parámetro `food` de una ruta; null si no es válido. */
export function parseFoodParam(raw: string | string[] | undefined): FoodRef | null {
  if (typeof raw !== 'string') return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const f = data as Record<string, unknown>;

  if (!FOOD_SOURCES.includes(f.source as FoodRef['source'])) return null;
  if (typeof f.name !== 'string' || f.name.trim() === '') return null;
  if (f.brand != null && typeof f.brand !== 'string') return null;
  if (f.id != null && typeof f.id !== 'string') return null;
  if (f.externalId != null && typeof f.externalId !== 'string') return null;
  if (f.source !== 'off' && typeof f.id !== 'string') return null;
  if (typeof f.per100g !== 'object' || f.per100g === null) return null;
  const per100g = f.per100g as Record<string, unknown>;
  if (Object.keys(nutrientErrors(per100g)).length > 0) return null;

  return {
    source: f.source as FoodRef['source'],
    id: f.id as string | undefined,
    externalId: f.externalId as string | undefined,
    name: f.name.trim(),
    brand: (f.brand as string | null | undefined) ?? null,
    per100g: {
      kcal: per100g.kcal as number,
      protein: per100g.protein as number,
      carbs: per100g.carbs as number,
      fat: per100g.fat as number,
    },
  };
}
