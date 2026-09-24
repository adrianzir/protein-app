import { describe, expect, it } from '@jest/globals';

import type { ProfileInput } from './types';
import { validateProfile } from './validation';

const today = '2026-09-24';
const valid: ProfileInput = {
  sex: 'female',
  birthDate: '1990-05-10',
  heightCm: 165,
  weightKg: 60,
  activityLevel: 'light',
  goal: 'maintain',
};

const errorsFor = (patch: Partial<Record<keyof ProfileInput, unknown>>) => {
  const r = validateProfile({ ...valid, ...patch } as ProfileInput, today);
  return r.ok ? {} : r.errors;
};

describe('validateProfile', () => {
  it('acepta un perfil válido', () => {
    expect(validateProfile(valid, today)).toEqual({ ok: true, value: valid });
  });

  it('edad: 12 ✗, 13 ✓, 100 ✓, 101 ✗', () => {
    expect(errorsFor({ birthDate: '2013-09-25' }).birthDate).toBeDefined(); // 12 años
    expect(errorsFor({ birthDate: '2013-09-24' }).birthDate).toBeUndefined(); // 13
    expect(errorsFor({ birthDate: '1926-09-25' }).birthDate).toBeUndefined(); // 99 → 100 mañana
    expect(errorsFor({ birthDate: '1926-09-24' }).birthDate).toBeUndefined(); // 100
    expect(errorsFor({ birthDate: '1925-09-24' }).birthDate).toBeDefined(); // 101
  });

  it('fecha futura o inválida', () => {
    expect(errorsFor({ birthDate: '2027-01-01' }).birthDate).toBeDefined();
    expect(errorsFor({ birthDate: '1990-02-30' }).birthDate).toBeDefined();
  });

  it('estatura: 99 ✗, 100 ✓, 250 ✓, 251 ✗', () => {
    expect(errorsFor({ heightCm: 99 }).heightCm).toBeDefined();
    expect(errorsFor({ heightCm: 100 }).heightCm).toBeUndefined();
    expect(errorsFor({ heightCm: 250 }).heightCm).toBeUndefined();
    expect(errorsFor({ heightCm: 251 }).heightCm).toBeDefined();
  });

  it('peso: 29 ✗, 30 ✓, 300 ✓, 301 ✗, NaN ✗', () => {
    expect(errorsFor({ weightKg: 29 }).weightKg).toBeDefined();
    expect(errorsFor({ weightKg: 30 }).weightKg).toBeUndefined();
    expect(errorsFor({ weightKg: 300 }).weightKg).toBeUndefined();
    expect(errorsFor({ weightKg: 301 }).weightKg).toBeDefined();
    expect(errorsFor({ weightKg: NaN }).weightKg).toBeDefined();
  });

  it('exige todos los campos', () => {
    const r = validateProfile({}, today);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(Object.keys(r.errors).sort()).toEqual(
        ['activityLevel', 'birthDate', 'goal', 'heightCm', 'sex', 'weightKg'].sort(),
      );
    }
  });

  it('rechaza valores fuera de las listas', () => {
    expect(errorsFor({ sex: 'other' }).sex).toBeDefined();
    expect(errorsFor({ activityLevel: 'extreme' }).activityLevel).toBeDefined();
    expect(errorsFor({ goal: 'bulk' }).goal).toBeDefined();
  });
});
