/** Valores nutricionales por 100 g. */
export type NutrientsPer100g = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export const FOOD_SOURCES = ['catalog', 'custom', 'off'] as const;
export type FoodSource = (typeof FOOD_SOURCES)[number];

/**
 * Alimento elegible para registrar. `id` existe para catálogo y personalizados;
 * `externalId` es el código de barras de Open Food Facts.
 */
export type FoodRef = {
  source: FoodSource;
  id?: string;
  externalId?: string;
  name: string;
  brand?: string | null;
  per100g: NutrientsPer100g;
};

export const FOOD_LIMITS = {
  nameMax: 120,
  brandMax: 80,
  kcalMax: 900,
  macrosSumMax: 100,
} as const;
