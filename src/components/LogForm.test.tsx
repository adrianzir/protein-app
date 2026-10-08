import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

import type { FoodRef } from '@/features/foods/types';

import { LogForm } from './LogForm';

const food: FoodRef = {
  source: 'off',
  externalId: '7802800716500',
  name: 'Yogur batido',
  per100g: { kcal: 95, protein: 3.2, carbs: 15, fat: 2.5 },
};

const renderForm = async (f: FoodRef, gramsText = '100') => {
  const onGramsText = jest.fn();
  await render(
    <LogForm
      food={f}
      gramsText={gramsText}
      onGramsText={onGramsText}
      grams={Number(gramsText)}
      mealType="snack"
      onMealType={jest.fn()}
    />,
  );
  return onGramsText;
};

describe('LogForm · porción del envase (Spec 002 · R3.3)', () => {
  it('sin porción no muestra el botón', async () => {
    await renderForm(food);
    expect(screen.queryByText(/porción/)).toBeNull();
  });

  it('con porción muestra el botón y lo aplica a los gramos', async () => {
    const onGramsText = await renderForm({ ...food, servingGrams: 155 });
    const chip = await screen.findByLabelText('1 porción · 155 g');
    expect(chip).not.toBeChecked(); // el valor inicial sigue siendo 100 g
    await fireEvent.press(chip);
    expect(onGramsText).toHaveBeenCalledWith('155');
  });

  it('marca el botón cuando los gramos coinciden con la porción', async () => {
    await renderForm({ ...food, servingGrams: 155 }, '155');
    expect(await screen.findByLabelText('1 porción · 155 g')).toBeChecked();
  });
});
