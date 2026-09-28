import { router, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { LogForm } from '@/components/LogForm';
import { Screen } from '@/components/Screen';
import { colors, font } from '@/components/theme';
import type { DiaryEntry } from '@/features/diary/api';
import { useDeleteEntry, useEntry, useUpdateEntry } from '@/features/diary/hooks';
import { validateGrams, type MealType } from '@/features/diary/macros';
import { confirmDestructive, errorMessage } from '@/lib/confirm';
import { formatGrams, parseDecimal } from '@/lib/format';

export default function EditLogScreen() {
  const headerHeight = useHeaderHeight();
  const { id } = useLocalSearchParams<{ id: string }>();
  const entry = useEntry(id);

  if (entry.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }
  if (entry.isError || !entry.data) {
    return (
      <Screen>
        {entry.isError ? (
          <Banner variant="error" message="No se pudo cargar el registro." actionLabel="Reintentar" onAction={() => entry.refetch()} />
        ) : (
          <Text style={styles.error}>El registro ya no existe.</Text>
        )}
        <Button title="Volver" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  return <EditLogForm key={entry.data.id} current={entry.data} headerHeight={headerHeight} />;
}

/** Se monta con el registro ya cargado, así el estado inicial sale directo de los datos. */
function EditLogForm({ current, headerHeight }: { current: DiaryEntry; headerHeight: number }) {
  const update = useUpdateEntry();
  const remove = useDeleteEntry();
  const [gramsText, setGramsText] = useState(formatGrams(current.grams));
  const [mealType, setMealType] = useState<MealType>(current.mealType);

  const grams = parseDecimal(gramsText);
  const gramsError = validateGrams(grams ?? NaN);
  const busy = update.isPending || remove.isPending;

  const onSave = () => {
    if (gramsError || grams == null) return;
    update.mutate(
      { id: current.id, patch: { grams, mealType } },
      { onSuccess: () => router.back(), onError: (e) => Alert.alert('No se pudo guardar', errorMessage(e)) },
    );
  };

  const onDelete = async () => {
    const ok = await confirmDestructive('Eliminar registro', `¿Eliminar "${current.food.name}" de tu diario?`, 'Eliminar');
    if (!ok) return;
    remove.mutate(current, {
      onSuccess: () => router.back(),
      onError: (e) => Alert.alert('No se pudo eliminar', errorMessage(e)),
    });
  };

  return (
    <Screen keyboardOffset={headerHeight}>
      <LogForm
        food={current.food}
        gramsText={gramsText}
        onGramsText={setGramsText}
        grams={grams}
        mealType={mealType}
        onMealType={setMealType}
        gramsError={gramsText.trim() ? (gramsError ?? undefined) : undefined}
      />
      <Button title="Guardar cambios" onPress={onSave} disabled={!!gramsError || busy} loading={update.isPending} />
      <Button title="Eliminar" variant="danger" onPress={onDelete} disabled={busy} loading={remove.isPending} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { color: colors.danger, fontSize: font.body },
});
