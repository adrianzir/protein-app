import { normalizeSearch } from '@/lib/text';

import type { FoodRef } from './types';

// Spec 004 · R1.4, R2.5: identidad de un alimento para recientes y favoritos.

/**
 * `catalog:<id>`, `custom:<id>` u `off:<código>`. Si falta el id (alimento propio borrado,
 * `food_id` = null en el registro), se usa el nombre normalizado.
 */
export function foodKey(food: Pick<FoodRef, 'source' | 'id' | 'externalId' | 'name'>): string {
  if (food.source === 'off' && food.externalId) return `off:${food.externalId}`;
  if (food.source !== 'off' && food.id) return `${food.source}:${food.id}`;
  return `${food.source}:name:${normalizeSearch(food.name)}`;
}
