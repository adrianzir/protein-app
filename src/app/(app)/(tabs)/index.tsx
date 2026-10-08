import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Banner } from '@/components/Banner';
import { DayNavigator } from '@/components/DayNavigator';
import { LogRow } from '@/components/LogRow';
import { MacroProgress } from '@/components/MacroProgress';
import { MealSection } from '@/components/MealSection';
import { Screen } from '@/components/Screen';
import { colors, radius, spacing } from '@/components/theme';
import { useDayEntries } from '@/features/diary/hooks';
import { groupByMeal, MEAL_LABELS, sumMacros, type MealType } from '@/features/diary/macros';
import { isProfileComplete } from '@/features/profile/goals';
import { useProfile } from '@/features/profile/hooks';
import { parseDateParam } from '@/features/diary/params';
import { toLocalISODate } from '@/lib/date';

export default function TodayScreen() {
  const params = useLocalSearchParams<{ date?: string }>();
  const today = toLocalISODate();
  const date = parseDateParam(params.date, today);

  const profile = useProfile();
  const entries = useDayEntries(date);

  const targets = profile.data?.targets ?? null;
  const incomplete = profile.isSuccess && !isProfileComplete(profile.data?.draft);
  const totals = sumMacros(entries.data ?? []);
  const groups = groupByMeal(entries.data ?? []);

  const addTo = (meal: MealType) => router.push({ pathname: '/food-search', params: { date, meal } });

  return (
    <Screen>
      <DayNavigator date={date} today={today} onChange={(d) => router.setParams({ date: d })} />

      {incomplete ? (
        <Banner
          message="Completa tu perfil para calcular tus metas diarias."
          actionLabel="Completar"
          onAction={() => router.navigate('/profile')}
        />
      ) : null}

      <View style={styles.summary}>
        <MacroProgress label="Calorías" consumed={totals.kcal} target={targets?.kcal ?? null} unit="kcal" color={colors.kcal} />
        <MacroProgress label="Proteína" consumed={totals.proteinG} target={targets?.proteinG ?? null} unit="g" color={colors.protein} />
        <MacroProgress label="Carbohidratos" consumed={totals.carbsG} target={targets?.carbsG ?? null} unit="g" color={colors.carbs} />
        <MacroProgress label="Grasas" consumed={totals.fatG} target={targets?.fatG ?? null} unit="g" color={colors.fat} />
      </View>

      {entries.isError ? (
        <Banner variant="error" message="No se pudieron cargar tus registros." actionLabel="Reintentar" onAction={() => entries.refetch()} />
      ) : null}

      {entries.isPending ? (
        <ActivityIndicator />
      ) : (
        groups.map((g) => (
          <MealSection
            key={g.mealType}
            title={MEAL_LABELS[g.mealType]}
            kcal={g.totals.kcal}
            empty={g.items.length === 0}
            onAdd={() => addTo(g.mealType)}
          >
            {g.items.map((entry) => (
              <LogRow
                key={entry.id}
                entry={entry}
                onPress={() => router.push({ pathname: '/log/[id]', params: { id: entry.id } })}
              />
            ))}
          </MealSection>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
});
