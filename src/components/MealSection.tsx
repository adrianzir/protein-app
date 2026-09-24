import { Ionicons } from '@expo/vector-icons';
import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatInt } from '@/lib/format';

import { colors, font, MIN_TOUCH, radius, spacing } from './theme';

type Props = PropsWithChildren<{
  title: string;
  kcal: number;
  empty: boolean;
  onAdd: () => void;
}>;

/** Sección de una comida con subtotal de kcal y botón "+" (R6.3). */
export function MealSection({ title, kcal, empty, onAdd, children }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <Text style={styles.kcal}>{formatInt(kcal)} kcal</Text>
        <Pressable
          onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel={`Agregar a ${title}`}
          style={styles.add}
        >
          <Ionicons name="add-circle" size={28} color={colors.primary} />
        </Pressable>
      </View>
      {empty ? <Text style={styles.empty}>Sin registros</Text> : children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1, fontSize: font.title, fontWeight: '700', color: colors.text },
  kcal: { fontSize: font.small, color: colors.muted },
  add: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  empty: { fontSize: font.small, color: colors.muted, paddingBottom: spacing.sm },
});
