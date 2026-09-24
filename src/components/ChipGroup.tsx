import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, font, MIN_TOUCH, radius, spacing } from './theme';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  label: string;
  options: readonly Option<T>[];
  value: T | null | undefined;
  onChange: (value: T) => void;
  error?: string;
};

/** Selección única accesible (sexo, actividad, objetivo, tipo de comida). */
export function ChipGroup<T extends string>({ label, options, value, onChange, error }: Props<T>) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(o.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={o.label}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

/** Convierte un mapa de etiquetas en opciones, en el orden de `values`. */
export function toOptions<T extends string>(values: readonly T[], labels: Record<T, string>) {
  return values.map((value) => ({ value, label: labels[value] }));
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { fontSize: font.small, fontWeight: '600', color: colors.text },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: font.small, color: colors.text },
  chipTextSelected: { color: colors.onPrimary, fontWeight: '600' },
  error: { color: colors.danger, fontSize: font.small },
});
