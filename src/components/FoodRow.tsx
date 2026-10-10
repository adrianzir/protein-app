import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { FoodRef } from '@/features/foods/types';
import { formatInt } from '@/lib/format';

import { colors, font, MIN_TOUCH, spacing } from './theme';

type Props = {
  food: FoodRef;
  onPress: () => void;
  /** Texto adicional, p. ej. "Última vez: 150 g" en Recientes (Spec 004 · R1.2). */
  subtitle?: string;
  /** Muestra la estrella de favorito (Spec 004 · R2.5). */
  favorite?: boolean;
};

/** Resultado de búsqueda: nombre, marca y kcal por 100 g (R3.3). */
export function FoodRow({ food, onPress, subtitle, favorite = false }: Props) {
  const kcal = `${formatInt(food.per100g.kcal)} kcal / 100 g`;
  const label = [food.name, food.brand, favorite ? 'favorito' : null, subtitle, kcal].filter(Boolean).join(', ');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.text}>
        <View style={styles.nameRow}>
          {favorite ? <Ionicons name="star" size={14} color={colors.star} testID="food-row-star" /> : null}
          <Text style={styles.name} numberOfLines={2}>
            {food.name}
          </Text>
        </View>
        {food.brand ? <Text style={styles.secondary}>{food.brand}</Text> : null}
        {subtitle ? <Text style={styles.secondary}>{subtitle}</Text> : null}
      </View>
      <Text style={styles.secondary}>{kcal}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: MIN_TOUCH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: { opacity: 0.6 },
  text: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  name: { flexShrink: 1, fontSize: font.body, color: colors.text },
  secondary: { fontSize: font.small, color: colors.muted },
});
