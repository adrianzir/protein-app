import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { normalizeSearch } from '@/lib/text';
import { useUserId } from '@/providers/AuthProvider';

import { createCustomFood, MIN_QUERY_LENGTH, searchLocalFoods } from './api';
import { searchOff } from './openFoodFacts';
import type { CustomFoodInput } from './validation';

export const foodKeys = {
  local: (q: string) => ['foods', 'local', q] as const,
  localAll: ['foods', 'local'] as const,
  off: (q: string) => ['foods', 'off', q] as const,
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

export function useCreateFood() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CustomFoodInput) => createCustomFood(userId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: foodKeys.localAll }),
  });
}
