import { router, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';

import { Button } from '@/components/Button';
import { LogForm } from '@/components/LogForm';
import { Screen } from '@/components/Screen';
import { colors, font } from '@/components/theme';
import { useAddEntry } from '@/features/diary/hooks';
import { GRAMS_LIMITS, validateGrams, type MealType } from '@/features/diary/macros';
import { parseDateParam, parseMealParam } from '@/features/diary/params';
import { parseFoodParam } from '@/features/foods/validation';
import { errorMessage } from '@/lib/confirm';
import { parseDecimal } from '@/lib/format';

export default function NewLogScreen() {
  const headerHeight = useHeaderHeight();
  const params = useLocalSearchParams<{ date?: string; meal?: string; food?: string }>();
  const food = parseFoodParam(params.food);
  const date = parseDateParam(params.date); // R5.5: el día que se está viendo en Hoy

  const [gramsText, setGramsText] = useState(String(GRAMS_LIMITS.default)); // R5.1
  const [mealType, setMealType] = useState<MealType>(parseMealParam(params.meal));
  const add = useAddEntry();

  if (!food) {
    return (
      <Screen>
        <Text style={styles.error}>Alimento no válido.</Text>
        <Button title="Volver" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const grams = parseDecimal(gramsText);
  const gramsError = validateGrams(grams ?? NaN);

  const onSave = () => {
    if (gramsError || grams == null) return;
    add.mutate(
      { eatenOn: date, mealType, grams, food },
      {
        onSuccess: () => router.dismissTo({ pathname: '/', params: { date } }),
        onError: (e) => Alert.alert('No se pudo guardar', errorMessage(e)),
      },
    );
  };

  return (
    <Screen keyboardOffset={headerHeight}>
      <LogForm
        food={food}
        gramsText={gramsText}
        onGramsText={setGramsText}
        grams={grams}
        mealType={mealType}
        onMealType={setMealType}
        gramsError={gramsText.trim() ? (gramsError ?? undefined) : undefined}
      />
      <Button title="Guardar" onPress={onSave} disabled={!!gramsError} loading={add.isPending} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.danger, fontSize: font.body },
});
