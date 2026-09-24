import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DiaryEntry } from '@/features/diary/api';
import { formatGrams, formatInt } from '@/lib/format';

import { colors, font, MIN_TOUCH, spacing } from './theme';

type Props = { entry: DiaryEntry; onPress: () => void };

/** Registro del día: alimento, gramos, kcal y P/C/G. Al tocarlo se edita (R5.6). */
export function LogRow({ entry, onPress }: Props) {
  const grams = `${formatGrams(entry.grams)} g`;
  const macros = `P ${formatInt(entry.proteinG)} · C ${formatInt(entry.carbsG)} · G ${formatInt(entry.fatG)}`;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${entry.food.name}, ${grams}, ${formatInt(entry.kcal)} kcal. Editar`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {entry.food.name}
        </Text>
        <Text style={styles.detail}>
          {grams} · {macros}
        </Text>
      </View>
      <Text style={styles.kcal}>{formatInt(entry.kcal)} kcal</Text>
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
  },
  pressed: { opacity: 0.6 },
  text: { flex: 1 },
  name: { fontSize: font.body, color: colors.text },
  detail: { fontSize: font.small, color: colors.muted },
  kcal: { fontSize: font.body, color: colors.text, fontWeight: '600' },
});
