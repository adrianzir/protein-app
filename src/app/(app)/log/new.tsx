import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';

import { Button } from '@/components/Button';
import { FavoriteButton } from '@/components/FavoriteButton';
import { LogForm } from '@/components/LogForm';
import { Screen } from '@/components/Screen';
import { colors, font } from '@/components/theme';
import { useAddEntry } from '@/features/diary/hooks';
import { validateGrams, type MealType } from '@/features/diary/macros';
import { parseDateParam, parseGramsParam, parseMealParam } from '@/features/diary/params';
import { parseFoodParam } from '@/features/foods/validation';
import { errorMessage } from '@/lib/confirm';
import { formatGrams, parseDecimal } from '@/lib/format';

export default function NewLogScreen() {
  const headerHeight = useHeaderHeight();
  const params = useLocalSearchParams<{ date?: string; meal?: string; food?: string; grams?: string }>();
  // Memo: el alimento se usa en las opciones de la barra, que no deben cambiar en cada render.
  const food = useMemo(() => parseFoodParam(params.food), [params.food]);
  const headerRight = useMemo(() => {
    if (!food) return undefined;
    const HeaderStar = () => <FavoriteButton food={food} />;
    return HeaderStar;
  }, [food]);
  const date = parseDateParam(params.date); // R5.5: el día que se está viendo en Hoy

  // R5.1: 100 g, o los gramos de la última vez si viene de Recientes o Favoritos (Spec 004 · R1.3, R2.3)
  const [gramsText, setGramsText] = useState(formatGrams(parseGramsParam(params.grams)));
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
      <Stack.Screen options={{ headerRight }} />
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
