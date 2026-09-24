import { describe, expect, it, jest } from '@jest/globals';

import { profileFromRow, profileToRow, type ProfileRow } from './api';

// El cliente real exige variables de entorno; estos tests solo prueban los mapeos.
jest.mock('@/lib/supabase', () => ({ supabase: {} }));

const row: ProfileRow = {
  id: 'u1',
  display_name: null,
  sex: 'male',
  birth_date: '1996-01-15',
  height_cm: 180,
  weight_kg: 80.5,
  activity_level: 'moderate',
  goal: 'maintain',
  target_kcal: 2759,
  target_protein_g: 128,
  target_carbs_g: 389,
  target_fat_g: 77,
};

describe('profileFromRow', () => {
  it('mapea datos y metas', () => {
    expect(profileFromRow(row)).toEqual({
      id: 'u1',
      draft: {
        sex: 'male',
        birthDate: '1996-01-15',
        heightCm: 180,
        weightKg: 80.5,
        activityLevel: 'moderate',
        goal: 'maintain',
      },
      targets: { kcal: 2759, proteinG: 128, carbsG: 389, fatG: 77 },
    });
  });

  it('perfil nuevo (todo null) → sin metas', () => {
    const empty = profileFromRow({
      ...row,
      sex: null,
      birth_date: null,
      height_cm: null,
      weight_kg: null,
      activity_level: null,
      goal: null,
      target_kcal: null,
      target_protein_g: null,
      target_carbs_g: null,
      target_fat_g: null,
    });
    expect(empty.targets).toBeNull();
    expect(empty.draft.heightCm).toBeNull();
  });
});

describe('profileToRow', () => {
  it('redondea a 1 decimal y agrega metas', () => {
    const r = profileToRow(
      { sex: 'female', birthDate: '1990-05-10', heightCm: 165.26, weightKg: 60.04, activityLevel: 'light', goal: 'lose' },
      { kcal: 1452, proteinG: 120, carbsG: 152, fatG: 40 },
    );
    expect(r.height_cm).toBe(165.3);
    expect(r.weight_kg).toBe(60);
    expect(r.target_kcal).toBe(1452);
  });
});
