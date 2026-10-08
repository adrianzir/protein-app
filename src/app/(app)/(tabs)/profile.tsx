import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { useHeaderHeight } from 'expo-router/react-navigation';

import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { ChipGroup, toOptions } from '@/components/ChipGroup';
import { DateField } from '@/components/DateField';
import { NumberField } from '@/components/NumberField';
import { Screen } from '@/components/Screen';
import { colors, font, radius, spacing } from '@/components/theme';
import { calculateTargets } from '@/features/profile/goals';
import { useProfile, useSaveProfile } from '@/features/profile/hooks';
import {
  ACTIVITY_LABELS,
  ACTIVITY_LEVELS,
  GOAL_LABELS,
  GOALS,
  SEX_LABELS,
  SEXES,
  type ActivityLevel,
  type Goal,
  type Sex,
} from '@/features/profile/types';
import { validateProfile, type ProfileDraft } from '@/features/profile/validation';
import { errorMessage } from '@/lib/confirm';
import { toLocalISODate, type ISODate } from '@/lib/date';
import { decimalToText, parseDecimal } from '@/lib/format';
import { supabase } from '@/lib/supabase';

type Form = {
  sex: Sex | null;
  birthDate: ISODate | null;
  height: string;
  weight: string;
  activityLevel: ActivityLevel | null;
  goal: Goal | null;
};

const formFromDraft = (d: ProfileDraft | undefined): Form => ({
  sex: d?.sex ?? null,
  birthDate: d?.birthDate ?? null,
  height: decimalToText(d?.heightCm),
  weight: decimalToText(d?.weightKg),
  activityLevel: d?.activityLevel ?? null,
  goal: d?.goal ?? null,
});

export default function ProfileScreen() {
  const profile = useProfile();

  if (profile.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ProfileForm
      key={profile.dataUpdatedAt}
      initial={formFromDraft(profile.data?.draft)}
      loadError={profile.isError}
      onRetry={() => profile.refetch()}
    />
  );
}

/** Se monta con el perfil ya cargado, así el estado inicial sale directo de los datos. */
function ProfileForm({ initial, loadError, onRetry }: { initial: Form; loadError: boolean; onRetry: () => void }) {
  const headerHeight = useHeaderHeight();
  const save = useSaveProfile();
  const [form, setForm] = useState<Form>(initial);
  const [submitted, setSubmitted] = useState(false);
  const today = toLocalISODate();

  const result = useMemo(
    () =>
      validateProfile(
        {
          sex: form.sex,
          birthDate: form.birthDate,
          heightCm: parseDecimal(form.height),
          weightKg: parseDecimal(form.weight),
          activityLevel: form.activityLevel,
          goal: form.goal,
        },
        today,
      ),
    [form, today],
  );
  // Vista previa en vivo de las metas (R2.3).
  const preview = result.ok ? calculateTargets(result.value, today) : null;
  const errors = submitted && !result.ok ? result.errors : {};

  const set = <K extends keyof Form>(key: K) => (value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  const onSave = () => {
    setSubmitted(true);
    if (!result.ok) return;
    save.mutate(result.value, {
      onSuccess: () => Alert.alert('Perfil guardado', 'Tus metas se actualizaron.'),
      onError: (e) => Alert.alert('No se pudo guardar', errorMessage(e)),
    });
  };

  return (
    <Screen keyboardOffset={headerHeight}>
      {loadError ? (
        <Banner variant="error" message="No se pudo cargar tu perfil." actionLabel="Reintentar" onAction={onRetry} />
      ) : null}

      <ChipGroup
        label="Sexo biológico (para el cálculo)"
        options={toOptions(SEXES, SEX_LABELS)}
        value={form.sex}
        onChange={set('sex')}
        error={errors.sex}
      />
      <DateField
        label="Fecha de nacimiento"
        value={form.birthDate}
        onChange={set('birthDate')}
        maximumDate={new Date()}
        error={errors.birthDate}
      />
      <View style={styles.row}>
        <View style={styles.flex}>
          <NumberField label="Estatura" unit="cm" value={form.height} onChangeText={set('height')} error={errors.heightCm} />
        </View>
        <View style={styles.flex}>
          <NumberField label="Peso" unit="kg" value={form.weight} onChangeText={set('weight')} error={errors.weightKg} />
        </View>
      </View>
      <ChipGroup
        label="Nivel de actividad"
        options={toOptions(ACTIVITY_LEVELS, ACTIVITY_LABELS)}
        value={form.activityLevel}
        onChange={set('activityLevel')}
        error={errors.activityLevel}
      />
      <ChipGroup
        label="Objetivo"
        options={toOptions(GOALS, GOAL_LABELS)}
        value={form.goal}
        onChange={set('goal')}
        error={errors.goal}
      />

      <View style={styles.card} accessible accessibilityLabel="Metas diarias">
        <Text style={styles.cardTitle}>Tus metas diarias</Text>
        {preview ? (
          <Text style={styles.cardBody}>
            {preview.kcal} kcal · Proteína {preview.proteinG} g · Carbohidratos {preview.carbsG} g · Grasas {preview.fatG} g
          </Text>
        ) : (
          <Text style={styles.cardMuted}>Completa tus datos para calcularlas.</Text>
        )}
      </View>

      <Button title="Guardar" onPress={onSave} loading={save.isPending} />
      <Button title="Cerrar sesión" variant="secondary" onPress={() => supabase.auth.signOut()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardTitle: { fontSize: font.body, fontWeight: '700', color: colors.text },
  cardBody: { fontSize: font.small, color: colors.text },
  cardMuted: { fontSize: font.small, color: colors.muted },
});
