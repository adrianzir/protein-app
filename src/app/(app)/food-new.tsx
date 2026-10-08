import { router, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { NumberField } from '@/components/NumberField';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { colors, font, spacing } from '@/components/theme';
import { parseDateParam, parseMealParam } from '@/features/diary/params';
import { parseBarcodeParam } from '@/features/barcode/gtin';
import { useCreateFood } from '@/features/foods/hooks';
import { encodeFoodParam, validateCustomFood } from '@/features/foods/validation';
import { errorMessage } from '@/lib/confirm';
import { parseDecimal } from '@/lib/format';

export default function NewFoodScreen() {
  const headerHeight = useHeaderHeight();
  const params = useLocalSearchParams<{
    date?: string;
    meal?: string;
    name?: string;
    brand?: string;
    barcode?: string;
    kcal?: string;
    protein?: string;
    carbs?: string;
    fat?: string;
  }>();
  const date = parseDateParam(params.date);
  const meal = parseMealParam(params.meal);
  // Desde el escáner llegan el código y lo que se conozca del producto (Spec 002 · R4.1).
  const barcode = parseBarcodeParam(params.barcode);
  const initial = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '');

  const [name, setName] = useState(initial(params.name));
  const [brand, setBrand] = useState(initial(params.brand));
  const [kcal, setKcal] = useState(initial(params.kcal));
  const [protein, setProtein] = useState(initial(params.protein));
  const [carbs, setCarbs] = useState(initial(params.carbs));
  const [fat, setFat] = useState(initial(params.fat));
  const [submitted, setSubmitted] = useState(false);
  const create = useCreateFood();

  const result = validateCustomFood({
    name,
    brand,
    kcal: parseDecimal(kcal),
    protein: parseDecimal(protein),
    carbs: parseDecimal(carbs),
    fat: parseDecimal(fat),
  });
  const errors = submitted && !result.ok ? result.errors : {};

  const onSave = () => {
    setSubmitted(true);
    if (!result.ok) return;
    create.mutate({ ...result.value, barcode }, {
      onSuccess: (food) =>
        router.replace({ pathname: '/log/new', params: { date, meal, food: encodeFoodParam(food) } }),
      onError: (e) => Alert.alert('No se pudo guardar', errorMessage(e)),
    });
  };

  return (
    <Screen keyboardOffset={headerHeight}>
      <Text style={styles.help}>Copia los valores por 100 g de la etiqueta nutricional.</Text>
      {barcode ? <Text style={styles.help}>Código de barras: {barcode}</Text> : null}
      <TextField label="Nombre" value={name} onChangeText={setName} error={errors.name} maxLength={120} />
      <TextField label="Marca (opcional)" value={brand} onChangeText={setBrand} error={errors.brand} maxLength={80} />
      <NumberField label="Calorías" unit="kcal" value={kcal} onChangeText={setKcal} error={errors.kcal} />
      <View style={styles.row}>
        <View style={styles.flex}>
          <NumberField label="Proteína" unit="g" value={protein} onChangeText={setProtein} error={errors.protein} />
        </View>
        <View style={styles.flex}>
          <NumberField label="Carbohidratos" unit="g" value={carbs} onChangeText={setCarbs} error={errors.carbs} />
        </View>
        <View style={styles.flex}>
          <NumberField label="Grasas" unit="g" value={fat} onChangeText={setFat} error={errors.fat} />
        </View>
      </View>
      {errors.macros ? <Text style={styles.error}>{errors.macros}</Text> : null}
      <Button title="Guardar y registrar" onPress={onSave} loading={create.isPending} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  help: { color: colors.muted, fontSize: font.small },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  error: { color: colors.danger, fontSize: font.small },
});
