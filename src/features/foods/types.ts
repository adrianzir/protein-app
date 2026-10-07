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
  /** Porción del envase en gramos, si el producto la informa (Spec 002 · R3.3). */
  servingGrams?: number;
};

export const FOOD_LIMITS = {
  nameMax: 120,
  brandMax: 80,
  kcalMax: 900,
  macrosSumMax: 100,
} as const;

/** Porción del envase válida, en gramos (Spec 002 · R3.3). */
export const SERVING_LIMITS = { min: 1, max: 1000 } as const;
