import { isFuture, isValidISODate, type ISODate } from '@/lib/date';
import type { ValidationResult } from '@/lib/validation';

import { ageOn } from './goals';
import { ACTIVITY_LEVELS, GOALS, SEXES, type ProfileInput } from './types';

// Spec 001 · R1.2
export const PROFILE_LIMITS = {
  age: { min: 13, max: 100 },
  heightCm: { min: 100, max: 250 },
  weightKg: { min: 30, max: 300 },
} as const;

export type ProfileDraft = { [K in keyof ProfileInput]?: ProfileInput[K] | null };
export type ProfileErrors = Partial<Record<keyof ProfileInput, string>>;

const inRange = (n: number, { min, max }: { min: number; max: number }) =>
  Number.isFinite(n) && n >= min && n <= max;

export function validateProfile(
  draft: ProfileDraft,
  today: ISODate,
): ValidationResult<ProfileInput, ProfileErrors> {
  const errors: ProfileErrors = {};

  if (!draft.sex || !SEXES.includes(draft.sex)) errors.sex = 'Selecciona una opción.';

  if (!draft.birthDate || !isValidISODate(draft.birthDate) || isFuture(draft.birthDate, today)) {
    errors.birthDate = 'Ingresa una fecha de nacimiento válida.';
  } else if (!inRange(ageOn(draft.birthDate, today), PROFILE_LIMITS.age)) {
    errors.birthDate = `La edad debe estar entre ${PROFILE_LIMITS.age.min} y ${PROFILE_LIMITS.age.max} años.`;
  }

  if (draft.heightCm == null || !inRange(draft.heightCm, PROFILE_LIMITS.heightCm)) {
    errors.heightCm = `La estatura debe estar entre ${PROFILE_LIMITS.heightCm.min} y ${PROFILE_LIMITS.heightCm.max} cm.`;
  }

  if (draft.weightKg == null || !inRange(draft.weightKg, PROFILE_LIMITS.weightKg)) {
    errors.weightKg = `El peso debe estar entre ${PROFILE_LIMITS.weightKg.min} y ${PROFILE_LIMITS.weightKg.max} kg.`;
  }

  if (!draft.activityLevel || !ACTIVITY_LEVELS.includes(draft.activityLevel)) {
    errors.activityLevel = 'Selecciona tu nivel de actividad.';
  }

  if (!draft.goal || !GOALS.includes(draft.goal)) errors.goal = 'Selecciona tu objetivo.';

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: draft as ProfileInput };
}
