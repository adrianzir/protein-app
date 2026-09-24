import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { FoodRef } from '@/features/foods/types';
import { formatInt } from '@/lib/format';

import { colors, font, MIN_TOUCH, spacing } from './theme';

type Props = { food: FoodRef; onPress: () => void };

/** Resultado de búsqueda: nombre, marca y kcal por 100 g (R3.3). */
export function FoodRow({ food, onPress }: Props) {
  const kcal = `${formatInt(food.per100g.kcal)} kcal / 100 g`;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${food.name}${food.brand ? `, ${food.brand}` : ''}, ${kcal}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={2}>
          {food.name}
        </Text>
        {food.brand ? <Text style={styles.brand}>{food.brand}</Text> : null}
      </View>
      <Text style={styles.kcal}>{kcal}</Text>
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
  name: { fontSize: font.body, color: colors.text },
  brand: { fontSize: font.small, color: colors.muted },
  kcal: { fontSize: font.small, color: colors.muted },
});
