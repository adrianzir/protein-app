import type { ISODate } from '@/lib/date';

export const SEXES = ['male', 'female'] as const;
export type Sex = (typeof SEXES)[number];

export const ACTIVITY_LEVELS = ['sedentary', 'light', 'moderate', 'active', 'very_active'] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

export const GOALS = ['lose', 'maintain', 'gain'] as const;
export type Goal = (typeof GOALS)[number];

/** Datos del perfil necesarios para calcular metas (R1.1). */
export type ProfileInput = {
  sex: Sex;
  birthDate: ISODate;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
};

export type Targets = {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export const SEX_LABELS: Record<Sex, string> = { male: 'Hombre', female: 'Mujer' };

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentario',
  light: 'Ligero',
  moderate: 'Moderado',
  active: 'Activo',
  very_active: 'Muy activo',
};

export const GOAL_LABELS: Record<Goal, string> = {
  lose: 'Bajar de peso',
  maintain: 'Mantener',
  gain: 'Subir de peso',
};
