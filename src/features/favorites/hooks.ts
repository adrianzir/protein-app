import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { foodKey } from '@/features/foods/key';
import type { FoodRef } from '@/features/foods/types';

import { addFavorite, fetchFavorites, removeFavorite, type Favorite } from './api';

export const favoriteKeys = { all: ['favorites'] as const };

export type FavoritesData = { list: Favorite[]; keys: Set<string> };

/** Favoritos ordenados y el conjunto de claves para mostrar la estrella (R2.2, R2.5). */
export function useFavorites() {
  return useQuery({
    queryKey: favoriteKeys.all,
    queryFn: fetchFavorites,
    select: (list): FavoritesData => ({ list, keys: new Set(list.map((f) => f.key)) }),
  });
}

/** Marca (`favorite: true`) o quita un favorito (R2.1). */
export function useToggleFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ food, favorite }: { food: FoodRef; favorite: boolean }) =>
      favorite ? addFavorite(food) : removeFavorite(foodKey(food)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: favoriteKeys.all }),
  });
}
