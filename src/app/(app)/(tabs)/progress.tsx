import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Banner } from '@/components/Banner';
import { BarChart, type BarDatum } from '@/components/BarChart';
import { Button } from '@/components/Button';
import { ChipGroup } from '@/components/ChipGroup';
import { Screen } from '@/components/Screen';
import { colors, font, MIN_TOUCH, radius, spacing } from '@/components/theme';
import { useRangeTotals } from '@/features/diary/hooks';
import type { Macros } from '@/features/diary/macros';
import { isProfileComplete } from '@/features/profile/goals';
import { useProfile } from '@/features/profile/hooks';
import { periodSummary, shiftPeriod, type Metric, type PeriodLength } from '@/features/progress/stats';
import { formatDayLong, formatPeriodLabel, formatWeekdayShort, fromISODate, toLocalISODate } from '@/lib/date';
import { formatInt } from '@/lib/format';

// Spec 004 · R4: progreso de 7 o 30 días frente a la meta.

const METRICS: Record<Metric, { label: string; unit: string; color: string }> = {
  kcal: { label: 'Calorías', unit: 'kcal', color: colors.kcal },
  proteinG: { label: 'Proteína', unit: 'g', color: colors.protein },
  carbsG: { label: 'Carbohidratos', unit: 'g', color: colors.carbs },
  fatG: { label: 'Grasas', unit: 'g', color: colors.fat },
};
const METRIC_KEYS = Object.keys(METRICS) as Metric[];
const PERIOD_OPTIONS = [
  { value: '7', label: '7 días' },
  { value: '30', label: '30 días' },
] as const;

export default function ProgressScreen() {
  const today = toLocalISODate();
  const [length, setLength] = useState<PeriodLength>(7);
  const [end, setEnd] = useState(today);
  const [metric, setMetric] = useState<Metric>('kcal');

  const profile = useProfile();
  const range = useRangeTotals(end, length);

  const targets: Macros | null = profile.data?.targets ?? null;
  const incomplete = profile.isSuccess && !isProfileComplete(profile.data?.draft);
  const daily = range.data ?? [];
  const summary = periodSummary(daily, targets);
  const { label, unit, color } = METRICS[metric];
  const goal = targets ? targets[metric] : null;
  const start = daily[0]?.date ?? end;
  const periodLabel = formatPeriodLabel(start, end, today);

  const data: BarDatum[] = daily.map((d) => {
    const value = d.totals ? d.totals[metric] : null;
    return {
      date: d.date,
      value,
      label: length === 7 ? formatWeekdayShort(d.date) : String(fromISODate(d.date).getDate()),
      accessibilityLabel: `${formatDayLong(d.date, today)}: ${value === null ? 'sin registros' : `${formatInt(value)} ${unit}`}`,
    };
  });

  const average = summary.average ? summary.average[metric] : null;
  const chartSummary = [
    `${label}, ${periodLabel}.`,
    average === null ? 'Sin registros.' : `Promedio ${formatInt(average)} ${unit} por día con registros.`,
    goal ? `Meta ${formatInt(goal)} ${unit}.` : null,
    `${summary.daysLogged} de ${summary.daysTotal} días con registros.`,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Screen>
      <ChipGroup
        label="Período"
        options={PERIOD_OPTIONS}
        value={String(length) as '7' | '30'}
        onChange={(v) => setLength(Number(v) as PeriodLength)}
      />

      <PeriodNavigator
        label={periodLabel}
        canGoForward={end < today}
        onBack={() => setEnd(shiftPeriod(end, length, -1, today))}
        onForward={() => setEnd(shiftPeriod(end, length, 1, today))}
      />

      {incomplete ? (
        <Banner
          message="Completa tu perfil para ver tu meta."
          actionLabel="Completar"
          onAction={() => router.navigate('/profile')}
        />
      ) : null}

      {range.isError ? (
        <Banner variant="error" message="No se pudo cargar tu progreso." actionLabel="Reintentar" onAction={() => range.refetch()} />
      ) : null}

      {range.isPending ? <ActivityIndicator /> : null}

      {range.isSuccess && summary.daysLogged === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No hay registros en este período.</Text>
          <Button title="Ir a Hoy" variant="secondary" onPress={() => router.navigate('/')} />
        </View>
      ) : null}

      {range.isSuccess && summary.daysLogged > 0 ? (
        <>
          <ChipGroup
            label="Ver"
            options={METRIC_KEYS.map((k) => ({ value: k, label: METRICS[k].label }))}
            value={metric}
            onChange={setMetric}
          />

          <View style={styles.card}>
            <BarChart
              data={data}
              goal={goal}
              color={color}
              summary={chartSummary}
              labelEvery={length === 7 ? 1 : 5}
              onPressDay={(date) => router.navigate({ pathname: '/', params: { date } })}
            />
            {goal ? <Text style={styles.note}>Comparado con tu meta actual. Toca un día para verlo.</Text> : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle} accessibilityRole="header">
              Promedio diario
            </Text>
            {METRIC_KEYS.map((k) => (
              <View key={k} style={styles.statRow}>
                <Text style={styles.statLabel}>{METRICS[k].label}</Text>
                <Text style={styles.statValue}>
                  {summary.average ? `${formatInt(summary.average[k])} ${METRICS[k].unit}` : '—'}
                  {targets ? ` / ${formatInt(targets[k])}` : ''}
                </Text>
              </View>
            ))}
            <View style={styles.divider} />
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Días con registros</Text>
              <Text style={styles.statValue}>
                {summary.daysLogged} de {summary.daysTotal}
              </Text>
            </View>
            {summary.daysWithinGoal !== null ? (
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Días dentro de la meta (±10 % kcal)</Text>
                <Text style={styles.statValue}>{summary.daysWithinGoal}</Text>
              </View>
            ) : null}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

function PeriodNavigator({
  label,
  canGoForward,
  onBack,
  onForward,
}: {
  label: string;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
}) {
  return (
    <View style={styles.navigator}>
      <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Período anterior" style={styles.arrow}>
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </Pressable>
      <Text style={styles.period} accessibilityRole="header">
        {label}
      </Text>
      <Pressable
        onPress={onForward}
        disabled={!canGoForward}
        accessibilityRole="button"
        accessibilityLabel="Período siguiente"
        accessibilityState={{ disabled: !canGoForward }}
        style={[styles.arrow, !canGoForward && styles.disabled]}
      >
        <Ionicons name="chevron-forward" size={24} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  navigator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.3 },
  period: { fontSize: font.title, fontWeight: '700', color: colors.text },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  cardTitle: { fontSize: font.body, fontWeight: '700', color: colors.text },
  note: { fontSize: font.small, color: colors.muted },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  statLabel: { flex: 1, fontSize: font.body, color: colors.text },
  statValue: { fontSize: font.body, color: colors.text, fontVariant: ['tabular-nums'] },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  empty: { gap: spacing.md, alignItems: 'stretch', paddingVertical: spacing.lg },
  emptyText: { fontSize: font.body, color: colors.muted, textAlign: 'center' },
});
