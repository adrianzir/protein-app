import { fromISODate, type ISODate } from '@/lib/date';

import type { ActivityLevel, Goal, ProfileInput, Sex, Targets } from './types';

// Spec 001 · R2 y diseño §3.1.
export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const GOAL_KCAL_FACTORS: Record<Goal, number> = { lose: 0.8, maintain: 1.0, gain: 1.1 };
export const PROTEIN_G_PER_KG: Record<Goal, number> = { lose: 2.0, maintain: 1.6, gain: 1.8 };
export const FAT_KCAL_SHARE = 0.25;

const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 } as const;

/** Años cumplidos a la fecha `today`. */
export function ageOn(birthDate: ISODate, today: ISODate): number {
  const birth = fromISODate(birthDate);
  const now = fromISODate(today);
  let age = now.getFullYear() - birth.getFullYear();
  const hadBirthday =
    now.getMonth() > birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
  if (!hadBirthday) age -= 1;
  return age;
}

/** Tasa metabólica basal, Mifflin-St Jeor (kcal/día). */
export function bmr(p: { sex: Sex; weightKg: number; heightCm: number; age: number }): number {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return p.sex === 'male' ? base + 5 : base - 161;
}

/** Gasto energético total diario (kcal/día). */
export function tdee(p: ProfileInput, today: ISODate): number {
  const age = ageOn(p.birthDate, today);
  return bmr({ ...p, age }) * ACTIVITY_FACTORS[p.activityLevel];
}

/** Metas diarias redondeadas a enteros (R2.1, R2.2, R2.5). */
export function calculateTargets(p: ProfileInput, today: ISODate): Targets {
  const kcal = tdee(p, today) * GOAL_KCAL_FACTORS[p.goal];
  const protein = p.weightKg * PROTEIN_G_PER_KG[p.goal];
  const fat = (kcal * FAT_KCAL_SHARE) / KCAL_PER_G.fat;
  const carbs = Math.max(
    0,
    (kcal - protein * KCAL_PER_G.protein - fat * KCAL_PER_G.fat) / KCAL_PER_G.carbs,
  );
  return {
    kcal: Math.round(kcal),
    proteinG: Math.round(protein),
    carbsG: Math.round(carbs),
    fatG: Math.round(fat),
  };
}

type MaybeProfile = { [K in keyof ProfileInput]?: ProfileInput[K] | null };

/** true si están todos los datos necesarios para calcular metas (R1.4). */
export function isProfileComplete(p: MaybeProfile | null | undefined): p is ProfileInput {
  return (
    !!p &&
    p.sex != null &&
    p.birthDate != null &&
    p.heightCm != null &&
    p.weightKg != null &&
    p.activityLevel != null &&
    p.goal != null
  );
}
