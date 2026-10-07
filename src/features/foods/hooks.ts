import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { normalizeSearch } from '@/lib/text';
import { useUserId } from '@/providers/AuthProvider';

import { lookupBarcode } from '@/features/barcode/lookup';

import { createCustomFood, findOwnFoodByBarcode, MIN_QUERY_LENGTH, searchLocalFoods } from './api';
import { fetchOffProduct, searchOff } from './openFoodFacts';
import type { CustomFoodInput } from './validation';

export const foodKeys = {
  local: (q: string) => ['foods', 'local', q] as const,
  localAll: ['foods', 'local'] as const,
  off: (q: string) => ['foods', 'off', q] as const,
  barcode: (gtin: string) => ['barcode', gtin] as const,
};

const TEN_MINUTES = 10 * 60 * 1000;

/** `query` debe venir ya con la espera aplicada (useDebouncedValue, R3.6). */
export function useLocalFoodSearch(query: string) {
  const q = normalizeSearch(query);
  return useQuery({
    queryKey: foodKeys.local(q),
    queryFn: () => searchLocalFoods(q),
    enabled: q.length >= MIN_QUERY_LENGTH,
    staleTime: 60_000,
  });
}

/** Búsqueda en Open Food Facts con caché de 10 min y sin reintentos (límite de uso, diseño D3). */
export function useOffSearch(query: string) {
  const q = normalizeSearch(query);
  return useQuery({
    queryKey: foodKeys.off(q),
    queryFn: ({ signal }) => searchOff(q, { signal }),
    enabled: q.length >= MIN_QUERY_LENGTH,
    staleTime: TEN_MINUTES,
    gcTime: TEN_MINUTES,
    retry: false,
  });
}

/**
 * Resuelve un GTIN canónico: alimento propio → Open Food Facts (Spec 002 · R3.1).
 * Un código ya resuelto no se vuelve a consultar en la sesión (R3.5). `gtin` null = desactivado.
 */
export function useBarcodeLookup(gtin: string | null) {
  return useQuery({
    queryKey: foodKeys.barcode(gtin ?? ''),
    queryFn: ({ signal }) =>
      lookupBarcode(
        gtin!,
        { findOwn: findOwnFoodByBarcode, fetchProduct: (g, s) => fetchOffProduct(g, { signal: s }) },
        signal,
      ),
    enabled: gtin !== null,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    retry: false,
  });
}

/** Datos del alimento nuevo; `barcode` (GTIN canónico) si viene del escáner (Spec 002 · R4.2). */
export type NewFoodVariables = CustomFoodInput & { barcode?: string };

export function useCreateFood() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ barcode, ...input }: NewFoodVariables) => createCustomFood(userId, input, barcode),
    onSuccess: (_food, { barcode }) => {
      void queryClient.invalidateQueries({ queryKey: foodKeys.localAll });
      if (barcode) void queryClient.invalidateQueries({ queryKey: foodKeys.barcode(barcode) });
    },
  });
}
