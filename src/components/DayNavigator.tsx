import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { addDays, formatDayLabel, type ISODate } from '@/lib/date';

import { colors, font, MIN_TOUCH } from './theme';

type Props = {
  date: ISODate;
  today: ISODate;
  onChange: (date: ISODate) => void;
};

/** ◀ fecha ▶ + "Ir a hoy". No permite avanzar a días futuros (R6.4). */
export function DayNavigator({ date, today, onChange }: Props) {
  const canGoForward = date < today;
  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => onChange(addDays(date, -1))}
        accessibilityRole="button"
        accessibilityLabel="Día anterior"
        style={styles.arrow}
      >
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </Pressable>

      <View style={styles.center}>
        <Text style={styles.label} accessibilityRole="header">
          {formatDayLabel(date, today)}
        </Text>
        {date !== today ? (
          <Pressable onPress={() => onChange(today)} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.today}>Ir a hoy</Text>
          </Pressable>
        ) : null}
      </View>

      <Pressable
        onPress={() => onChange(addDays(date, 1))}
        disabled={!canGoForward}
        accessibilityRole="button"
        accessibilityLabel="Día siguiente"
        accessibilityState={{ disabled: !canGoForward }}
        style={[styles.arrow, !canGoForward && styles.disabled]}
      >
        <Ionicons name="chevron-forward" size={24} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.3 },
  center: { alignItems: 'center', gap: 2 },
  label: { fontSize: font.title, fontWeight: '700', color: colors.text },
  today: { fontSize: font.small, color: colors.primary, fontWeight: '600' },
});
