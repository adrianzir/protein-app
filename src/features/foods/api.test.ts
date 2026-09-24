import { describe, expect, it, jest } from '@jest/globals';

import { buildSearchPatterns, foodFromRow } from './api';

// El cliente real exige variables de entorno; estos tests solo prueban los mapeos.
jest.mock('@/lib/supabase', () => ({ supabase: {} }));

describe('buildSearchPatterns', () => {
  it('un patrón por palabra, normalizado', () => {
    expect(buildSearchPatterns('  Pan   MOLDE ')).toEqual(['%pan%', '%molde%']);
    expect(buildSearchPatterns('Plátano')).toEqual(['%platano%']);
  });

  it('escapa comodines de LIKE', () => {
    expect(buildSearchPatterns('100%_x')).toEqual(['%100\\%\\_x%']);
  });

  it('vacío → sin patrones', () => {
    expect(buildSearchPatterns('   ')).toEqual([]);
  });
});

describe('foodFromRow', () => {
  it('convierte numeric (texto o número) a number', () => {
    const food = foodFromRow({
      id: 'f1',
      owner_id: null,
      source: 'catalog',
      slug: 'palta',
      name: 'Palta',
      brand: null,
      aliases: ['aguacate'],
      kcal_100g: '160' as unknown as number,
      protein_100g: 2,
      carbs_100g: 8.5,
      fat_100g: 14.7,
    });
    expect(food).toEqual({
      source: 'catalog',
      id: 'f1',
      name: 'Palta',
      brand: null,
      per100g: { kcal: 160, protein: 2, carbs: 8.5, fat: 14.7 },
    });
  });
});
