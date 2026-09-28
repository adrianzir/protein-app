import { StyleSheet, Text, View } from 'react-native';

import type { FoodRef } from '@/features/foods/types';
import { macrosFor, MEAL_LABELS, MEAL_TYPES, type MealType } from '@/features/diary/macros';
import { formatInt } from '@/lib/format';

import { ChipGroup, toOptions } from './ChipGroup';
import { NumberField } from './NumberField';
import { colors, font, radius, spacing } from './theme';

type Props = {
  food: FoodRef;
  gramsText: string;
  onGramsText: (text: string) => void;
  grams: number | null;
  mealType: MealType;
  onMealType: (meal: MealType) => void;
  gramsError?: string;
};

/** Formulario compartido de Registrar y Editar: gramos, comida y vista previa (R5.1, R5.2). */
export function LogForm({ food, gramsText, onGramsText, grams, mealType, onMealType, gramsError }: Props) {
  const preview = grams != null && grams > 0 ? macrosFor(food.per100g, grams) : null;
  return (
    <>
      <View style={styles.food}>
        <Text style={styles.name}>{food.name}</Text>
        {food.brand ? <Text style={styles.muted}>{food.brand}</Text> : null}
        <Text style={styles.muted}>
          Por 100 g: {formatInt(food.per100g.kcal)} kcal · P {food.per100g.protein} · C {food.per100g.carbs} · G{' '}
          {food.per100g.fat}
        </Text>
      </View>

      <NumberField label="Cantidad" unit="g" value={gramsText} onChangeText={onGramsText} error={gramsError} selectTextOnFocus />

      <ChipGroup label="Comida" options={toOptions(MEAL_TYPES, MEAL_LABELS)} value={mealType} onChange={onMealType} />

      <View style={styles.preview} accessible accessibilityLiveRegion="polite">
        <Text style={styles.previewKcal}>{preview ? `${formatInt(preview.kcal)} kcal` : '— kcal'}</Text>
        <Text style={styles.muted}>
          {preview
            ? `Proteína ${formatInt(preview.proteinG)} g · Carbohidratos ${formatInt(preview.carbsG)} g · Grasas ${formatInt(preview.fatG)} g`
            : 'Ingresa la cantidad en gramos'}
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  food: { gap: 2 },
  name: { fontSize: font.title, fontWeight: '700', color: colors.text },
  muted: { fontSize: font.small, color: colors.muted },
  preview: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
    alignItems: 'center',
  },
  previewKcal: { fontSize: font.large, fontWeight: '700', color: colors.text },
});
