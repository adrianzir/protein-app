import { describe, expect, it } from '@jest/globals';

import { ACTIVITY_FACTORS, ageOn, bmr, calculateTargets, isProfileComplete } from './goals';
import { ACTIVITY_LEVELS, GOALS, type ProfileInput } from './types';

const today = '2026-09-24';
const base: ProfileInput = {
  sex: 'male',
  birthDate: '1996-01-15', // 30 años
  heightCm: 180,
  weightKg: 80,
  activityLevel: 'moderate',
  goal: 'maintain',
};

describe('ageOn', () => {
  it('cuenta años cumplidos', () => {
    expect(ageOn('1996-01-15', today)).toBe(30);
  });

  it('cumple años el mismo día', () => {
    expect(ageOn('1996-09-24', today)).toBe(30);
    expect(ageOn('1996-09-25', today)).toBe(29);
  });

  it('nacido un 29 de febrero', () => {
    expect(ageOn('2000-02-29', '2026-02-28')).toBe(25);
    expect(ageOn('2000-02-29', '2026-03-01')).toBe(26);
  });
});

describe('bmr (Mifflin-St Jeor)', () => {
  it('hombre: +5', () => {
    expect(bmr({ sex: 'male', weightKg: 80, heightCm: 180, age: 30 })).toBe(1780);
  });

  it('mujer: −161', () => {
    expect(bmr({ sex: 'female', weightKg: 60, heightCm: 165, age: 30 })).toBe(1320.25);
  });
});

describe('calculateTargets', () => {
  it('ejemplo del diseño §3.1', () => {
    expect(calculateTargets(base, today)).toEqual({
      kcal: 2759,
      proteinG: 128,
      fatG: 77,
      carbsG: 389,
    });
  });

  it('mujer, ligera, bajar de peso', () => {
    const t = calculateTargets(
      { ...base, sex: 'female', heightCm: 165, weightKg: 60, activityLevel: 'light', goal: 'lose' },
      today,
    );
    // kcal = 1320.25 × 1.375 × 0.8 = 1452.3 · grasa = 1452.3 × 0.25 / 9 = 40.3
    // carbs = (1452.3 − 120×4 − 363.1) / 4 = 152.3
    expect(t).toEqual({ kcal: 1452, proteinG: 120, fatG: 40, carbsG: 152 });
  });

  it('aplica los 5 factores de actividad', () => {
    for (const level of ACTIVITY_LEVELS) {
      const t = calculateTargets({ ...base, activityLevel: level }, today);
      expect(t.kcal).toBe(Math.round(1780 * ACTIVITY_FACTORS[level]));
    }
  });

  it('aplica los 3 objetivos', () => {
    const kcal = GOALS.map((goal) => calculateTargets({ ...base, goal }, today).kcal);
    expect(kcal).toEqual([Math.round(2759 * 0.8), 2759, Math.round(2759 * 1.1)]);
  });

  it('proteína según objetivo (g/kg)', () => {
    expect(calculateTargets({ ...base, goal: 'lose' }, today).proteinG).toBe(160);
    expect(calculateTargets({ ...base, goal: 'gain' }, today).proteinG).toBe(144);
  });

  it('carbohidratos nunca negativos', () => {
    const t = calculateTargets(
      { ...base, sex: 'female', weightKg: 150, heightCm: 100, birthDate: '1926-09-24', activityLevel: 'sedentary', goal: 'lose' },
      today,
    );
    expect(t.carbsG).toBe(0);
  });

  it('devuelve enteros', () => {
    const t = calculateTargets({ ...base, weightKg: 71.3, heightCm: 172.5 }, today);
    for (const v of Object.values(t)) expect(Number.isInteger(v)).toBe(true);
  });
});

describe('isProfileComplete', () => {
  it('true con todos los datos', () => {
    expect(isProfileComplete(base)).toBe(true);
  });

  it('false si falta alguno o es null', () => {
    expect(isProfileComplete(null)).toBe(false);
    expect(isProfileComplete({ ...base, weightKg: null })).toBe(false);
    const { goal: _goal, ...withoutGoal } = base;
    expect(isProfileComplete(withoutGoal)).toBe(false);
  });
});
