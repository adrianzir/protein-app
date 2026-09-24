import type { ISODate } from '@/lib/date';
import { supabase } from '@/lib/supabase';

import type { ActivityLevel, Goal, ProfileInput, Sex, Targets } from './types';
import type { ProfileDraft } from './validation';

/** Fila de `public.profiles` (escrita a mano hasta generar tipos con `supabase gen types`, diseño D5). */
export type ProfileRow = {
  id: string;
  display_name: string | null;
  sex: Sex | null;
  birth_date: ISODate | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity_level: ActivityLevel | null;
  goal: Goal | null;
  target_kcal: number | null;
  target_protein_g: number | null;
  target_carbs_g: number | null;
  target_fat_g: number | null;
};

export type Profile = {
  id: string;
  draft: ProfileDraft;
  targets: Targets | null;
};

export function profileFromRow(row: ProfileRow): Profile {
  const hasTargets =
    row.target_kcal != null &&
    row.target_protein_g != null &&
    row.target_carbs_g != null &&
    row.target_fat_g != null;
  return {
    id: row.id,
    draft: {
      sex: row.sex,
      birthDate: row.birth_date,
      heightCm: row.height_cm == null ? null : Number(row.height_cm),
      weightKg: row.weight_kg == null ? null : Number(row.weight_kg),
      activityLevel: row.activity_level,
      goal: row.goal,
    },
    targets: hasTargets
      ? {
          kcal: row.target_kcal!,
          proteinG: row.target_protein_g!,
          carbsG: row.target_carbs_g!,
          fatG: row.target_fat_g!,
        }
      : null,
  };
}

export function profileToRow(input: ProfileInput, targets: Targets) {
  return {
    sex: input.sex,
    birth_date: input.birthDate,
    height_cm: Math.round(input.heightCm * 10) / 10,
    weight_kg: Math.round(input.weightKg * 10) / 10,
    activity_level: input.activityLevel,
    goal: input.goal,
    target_kcal: targets.kcal,
    target_protein_g: targets.proteinG,
    target_carbs_g: targets.carbsG,
    target_fat_g: targets.fatG,
  } satisfies Partial<ProfileRow>;
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data ? profileFromRow(data as ProfileRow) : null;
}

export async function saveProfile(userId: string, input: ProfileInput, targets: Targets): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(profileToRow(input, targets))
    .eq('id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return profileFromRow(data as ProfileRow);
}
