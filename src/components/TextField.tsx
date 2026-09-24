import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, font, MIN_TOUCH, radius, spacing } from './theme';

export type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string;
  /** Unidad mostrada a la derecha (g, kg, cm, kcal). */
  unit?: string;
};

export function TextField({ label, error, unit, ...inputProps }: TextFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, error ? styles.inputError : null]}>
        <TextInput
          style={styles.input}
          placeholderTextColor={colors.muted}
          accessibilityLabel={label}
          accessibilityHint={error}
          {...inputProps}
        />
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { fontSize: font.small, fontWeight: '600', color: colors.text },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  inputError: { borderColor: colors.danger },
  input: { flex: 1, minHeight: MIN_TOUCH, fontSize: font.body, color: colors.text },
  unit: { color: colors.muted, fontSize: font.body, marginLeft: spacing.sm },
  error: { color: colors.danger, fontSize: font.small },
});
