import { describe, expect, it } from '@jest/globals';

import type { FoodRef } from './types';
import { encodeFoodParam, parseFoodParam, validateCustomFood } from './validation';

const draft = { name: '  Queque de la abuela ', brand: '', kcal: 380, protein: 6, carbs: 52, fat: 16 };

describe('validateCustomFood', () => {
  it('acepta y normaliza un alimento válido', () => {
    expect(validateCustomFood(draft)).toEqual({
      ok: true,
      value: {
        name: 'Queque de la abuela',
        brand: null,
        per100g: { kcal: 380, protein: 6, carbs: 52, fat: 16 },
      },
    });
  });

  it('rechaza valores negativos o vacíos', () => {
    const r = validateCustomFood({ ...draft, protein: -1, fat: null });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.protein).toBeDefined();
      expect(r.errors.fat).toBeDefined();
    }
  });

  it('rechaza macros que suman más de 100 g', () => {
    const r = validateCustomFood({ ...draft, protein: 50, carbs: 40, fat: 10.1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.macros).toBeDefined();
  });

  it('acepta macros que suman exactamente 100 g', () => {
    expect(validateCustomFood({ ...draft, kcal: 884, protein: 0, carbs: 0, fat: 100 }).ok).toBe(true);
  });

  it('rechaza kcal > 900', () => {
    const r = validateCustomFood({ ...draft, kcal: 901 });
    expect(r.ok).toBe(false);
  });

  it('exige nombre y limita largo de nombre y marca', () => {
    expect(validateCustomFood({ ...draft, name: '   ' }).ok).toBe(false);
    expect(validateCustomFood({ ...draft, name: 'x'.repeat(121) }).ok).toBe(false);
    expect(validateCustomFood({ ...draft, brand: 'x'.repeat(81) }).ok).toBe(false);
  });
});

describe('parseFoodParam', () => {
  const food: FoodRef = {
    source: 'off',
    externalId: '7802800716500',
    name: 'Yogur batido',
    brand: 'Marca',
    per100g: { kcal: 95, protein: 3.2, carbs: 15, fat: 2.5 },
  };

  it('ida y vuelta con encodeFoodParam', () => {
    expect(parseFoodParam(encodeFoodParam(food))).toEqual(food);
  });

  it('exige id para catálogo y personalizados', () => {
    expect(parseFoodParam(encodeFoodParam({ ...food, source: 'catalog' }))).toBeNull();
    expect(parseFoodParam(encodeFoodParam({ ...food, source: 'catalog', id: 'uuid' }))).not.toBeNull();
  });

  it('rechaza entradas inválidas', () => {
    expect(parseFoodParam(undefined)).toBeNull();
    expect(parseFoodParam(['a', 'b'])).toBeNull();
    expect(parseFoodParam('{no es json')).toBeNull();
    expect(parseFoodParam('null')).toBeNull();
    expect(parseFoodParam(JSON.stringify({ ...food, source: 'usda' }))).toBeNull();
    expect(parseFoodParam(JSON.stringify({ ...food, name: '' }))).toBeNull();
    expect(parseFoodParam(JSON.stringify({ ...food, per100g: { ...food.per100g, kcal: '95' } }))).toBeNull();
    expect(parseFoodParam(JSON.stringify({ ...food, per100g: { ...food.per100g, fat: 90 } }))).toBeNull();
  });
});
