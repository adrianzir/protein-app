import { StyleSheet, Text, View } from 'react-native';

import { colors, font, radius, spacing } from './theme';

type Props = {
  label: string;
  consumed: number;
  target: number | null;
  unit: 'kcal' | 'g';
  color: string;
};

/**
 * Consumido vs. meta con barra de progreso. Al superar la meta usa color de alerta
 * y además el texto "▲ +N", para no depender solo del color (R6.1, R6.2).
 */
export function MacroProgress({ label, consumed, target, unit, color }: Props) {
  const value = Math.round(consumed);
  const over = target != null && value > target;
  const ratio = target ? Math.min(value / target, 1) : 0;
  const amount = target != null ? `${value} / ${target} ${unit}` : `${value} ${unit}`;
  const a11y = over
    ? `${label}: ${value} de ${target} ${unit}, excedido por ${value - target!}`
    : target != null
      ? `${label}: ${value} de ${target} ${unit}`
      : `${label}: ${value} ${unit}`;

  return (
    <View style={styles.container} accessible accessibilityLabel={a11y}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.amount}>
          {amount}
          {over ? <Text style={styles.over}>{`  ▲ +${value - target!}`}</Text> : null}
        </Text>
      </View>
      <View style={styles.track}>
        <View
          testID="macro-progress-fill"
          style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: over ? colors.danger : color }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  label: { fontSize: font.small, fontWeight: '600', color: colors.text },
  amount: { fontSize: font.small, color: colors.muted },
  over: { color: colors.danger, fontWeight: '700' },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.track, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
});
