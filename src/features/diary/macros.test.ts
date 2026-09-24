import { describe, expect, it } from '@jest/globals';

import { groupByMeal, macrosFor, MEAL_TYPES, sumMacros, validateGrams, ZERO_MACROS } from './macros';

const platano = { kcal: 89, protein: 1.1, carbs: 22.8, fat: 0.3 };

describe('macrosFor', () => {
  it('escala por gramos', () => {
    const m = macrosFor(platano, 150);
    expect(m.kcal).toBeCloseTo(133.5);
    expect(m.proteinG).toBeCloseTo(1.65);
    expect(m.carbsG).toBeCloseTo(34.2);
    expect(m.fatG).toBeCloseTo(0.45);
  });

  it('100 g devuelve los valores base', () => {
    expect(macrosFor(platano, 100)).toEqual({ kcal: 89, proteinG: 1.1, carbsG: 22.8, fatG: 0.3 });
  });
});

describe('sumMacros', () => {
  it('lista vacía = 0', () => {
    expect(sumMacros([])).toEqual(ZERO_MACROS);
  });

  it('suma cada macro', () => {
    const s = sumMacros([macrosFor(platano, 100), macrosFor(platano, 50)]);
    expect(s.kcal).toBeCloseTo(133.5);
    expect(s.carbsG).toBeCloseTo(34.2);
  });
});

describe('groupByMeal', () => {
  it('devuelve las 5 comidas en orden, con subtotales', () => {
    const logs = [
      { id: 'a', mealType: 'dinner' as const, ...macrosFor(platano, 100) },
      { id: 'b', mealType: 'breakfast' as const, ...macrosFor(platano, 200) },
      { id: 'c', mealType: 'breakfast' as const, ...macrosFor(platano, 100) },
    ];
    const groups = groupByMeal(logs);
    expect(groups.map((g) => g.mealType)).toEqual([...MEAL_TYPES]);
    expect(groups[0].items.map((i) => i.id)).toEqual(['b', 'c']);
    expect(groups[0].totals.kcal).toBeCloseTo(267);
    expect(groups[1].items).toEqual([]);
    expect(groups[1].totals).toEqual(ZERO_MACROS);
    expect(groups[3].items.map((i) => i.id)).toEqual(['a']);
  });
});

describe('validateGrams', () => {
  it('0 ✗, 0.1 ✓, 5000 ✓, 5000.1 ✗', () => {
    expect(validateGrams(0)).not.toBeNull();
    expect(validateGrams(0.1)).toBeNull();
    expect(validateGrams(5000)).toBeNull();
    expect(validateGrams(5000.1)).not.toBeNull();
  });

  it('negativos y NaN ✗', () => {
    expect(validateGrams(-5)).not.toBeNull();
    expect(validateGrams(NaN)).not.toBeNull();
    expect(validateGrams(Infinity)).not.toBeNull();
  });
});
