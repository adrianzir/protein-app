import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, StyleSheet } from 'react-native';

import { useFavorites, useToggleFavorite } from '@/features/favorites/hooks';
import { foodKey } from '@/features/foods/key';
import type { FoodRef } from '@/features/foods/types';
import { errorMessage } from '@/lib/confirm';

import { colors, MIN_TOUCH } from './theme';

/** Estrella para marcar o quitar un favorito, en la barra de Registrar y Editar registro (Spec 004 · R2.1). */
export function FavoriteButton({ food }: { food: FoodRef }) {
  const favorites = useFavorites();
  const toggle = useToggleFavorite();
  const saved = favorites.data?.keys.has(foodKey(food)) ?? false;
  // Mientras se guarda se muestra el estado pedido; si falla, vuelve al guardado.
  const selected = toggle.isPending ? toggle.variables.favorite : saved;

  const onPress = () =>
    toggle.mutate(
      { food, favorite: !selected },
      { onError: (e) => Alert.alert('No se pudo actualizar favoritos', errorMessage(e)) },
    );

  return (
    <Pressable
      onPress={onPress}
      disabled={favorites.isPending || toggle.isPending}
      accessibilityRole="button"
      accessibilityLabel={selected ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      accessibilityState={{ selected }}
      style={styles.button}
    >
      <Ionicons name={selected ? 'star' : 'star-outline'} size={24} color={selected ? colors.star : colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
});
