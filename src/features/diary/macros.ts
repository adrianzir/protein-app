import type { NutrientsPer100g } from '@/features/foods/types';

// Spec 001 · R5.2, R5.3, R6.1, R6.3

export type Macros = {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export const MEAL_TYPES = ['breakfast', 'lunch', 'afternoon', 'dinner', 'snack'] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Desayuno',
  lunch: 'Almuerzo',
  afternoon: 'Merienda / once',
  dinner: 'Cena',
  snack: 'Snack',
};

export const GRAMS_LIMITS = { min: 0, max: 5000, default: 100 } as const;

export const ZERO_MACROS: Macros = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };

/** Macros para una cantidad en gramos: valor por 100 g × gramos / 100. */
export function macrosFor(per100g: NutrientsPer100g, grams: number): Macros {
  const f = grams / 100;
  return {
    kcal: per100g.kcal * f,
    proteinG: per100g.protein * f,
    carbsG: per100g.carbs * f,
    fatG: per100g.fat * f,
  };
}

export function sumMacros(items: readonly Macros[]): Macros {
  return items.reduce(
    (acc, m) => ({
      kcal: acc.kcal + m.kcal,
      proteinG: acc.proteinG + m.proteinG,
      carbsG: acc.carbsG + m.carbsG,
      fatG: acc.fatG + m.fatG,
    }),
    ZERO_MACROS,
  );
}

export type MealGroup<T> = { mealType: MealType; items: T[]; totals: Macros };

/** Agrupa por tipo de comida en orden fijo, incluyendo comidas vacías (para mostrar "+"). */
export function groupByMeal<T extends Macros & { mealType: MealType }>(
  logs: readonly T[],
): MealGroup<T>[] {
  return MEAL_TYPES.map((mealType) => {
    const items = logs.filter((l) => l.mealType === mealType);
    return { mealType, items, totals: sumMacros(items) };
  });
}

/** Error de validación o null. Se guarda con 1 decimal (columna numeric(6,1)). */
export function validateGrams(grams: number): string | null {
  if (!Number.isFinite(grams) || grams <= GRAMS_LIMITS.min) return 'Ingresa una cantidad mayor a 0 g.';
  if (grams > GRAMS_LIMITS.max) return `La cantidad máxima es ${GRAMS_LIMITS.max} g.`;
  return null;
}
