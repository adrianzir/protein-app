import type { OffProductResult } from '@/features/foods/openFoodFacts';
import type { FoodRef } from '@/features/foods/types';

// Spec 002 · R3.1, R6.1 y diseño §5.

export type BarcodeLookupResult =
  | { kind: 'found'; food: FoodRef; origin: 'own' | 'off' }
  | Exclude<OffProductResult, { kind: 'found' }>;

export type LookupDeps = {
  /** Alimento propio con ese GTIN (RLS limita al usuario), o null. */
  findOwn: (gtin: string) => Promise<FoodRef | null>;
  /** Producto en Open Food Facts. Lanza OffError ante errores de red. */
  fetchProduct: (gtin: string, signal?: AbortSignal) => Promise<OffProductResult>;
  warn?: (message: string, error: unknown) => void;
};

/**
 * Busca primero en los alimentos propios y, si no hay, en Open Food Facts.
 * Un error al leer los propios no bloquea: se sigue con OFF. Los errores de OFF se propagan.
 */
export async function lookupBarcode(
  gtin: string,
  { findOwn, fetchProduct, warn = console.warn }: LookupDeps,
  signal?: AbortSignal,
): Promise<BarcodeLookupResult> {
  try {
    const own = await findOwn(gtin);
    if (own) return { kind: 'found', food: own, origin: 'own' };
  } catch (e) {
    warn('No se pudo buscar el código en los alimentos propios; se sigue con Open Food Facts', e);
  }

  const result = await fetchProduct(gtin, signal);
  return result.kind === 'found' ? { ...result, origin: 'off' } : result;
}
