import { router, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Banner } from '@/components/Banner';
import { FoodRow } from '@/components/FoodRow';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { colors, font, spacing } from '@/components/theme';
import { parseDateParam, parseMealParam } from '@/features/diary/params';
import { MIN_QUERY_LENGTH } from '@/features/foods/api';
import { useLocalFoodSearch, useOffSearch } from '@/features/foods/hooks';
import type { FoodRef } from '@/features/foods/types';
import { encodeFoodParam } from '@/features/foods/validation';
import { normalizeSearch } from '@/lib/text';
import { useDebouncedValue } from '@/lib/useDebouncedValue';

export default function FoodSearchScreen() {
  const headerHeight = useHeaderHeight();
  const params = useLocalSearchParams<{ date?: string; meal?: string }>();
  const date = parseDateParam(params.date);
  const meal = parseMealParam(params.meal);

  const [text, setText] = useState('');
  const query = useDebouncedValue(text, 400); // R3.6
  const ready = normalizeSearch(query).length >= MIN_QUERY_LENGTH;

  const local = useLocalFoodSearch(query);
  const off = useOffSearch(query);

  const choose = (food: FoodRef) =>
    router.push({ pathname: '/log/new', params: { date, meal, food: encodeFoodParam(food) } });

  return (
    <Screen keyboardOffset={headerHeight}>
      <TextField
        label="Buscar"
        placeholder="Ej.: pollo, avena, yogur griego"
        value={text}
        onChangeText={setText}
        autoFocus
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />

      {!ready ? <Text style={styles.hint}>Escribe al menos {MIN_QUERY_LENGTH} letras.</Text> : null}

      {ready ? (
        <>
          <Section title="Mis alimentos y catálogo" loading={local.isFetching}>
            {local.isError ? (
              <Banner variant="error" message="No se pudo buscar en tus alimentos." actionLabel="Reintentar" onAction={() => local.refetch()} />
            ) : null}
            {local.data?.map((f) => <FoodRow key={f.id} food={f} onPress={() => choose(f)} />)}
            {local.isSuccess && local.data.length === 0 ? <Text style={styles.hint}>Sin resultados.</Text> : null}
          </Section>

          <Section title="Open Food Facts" loading={off.isFetching}>
            {/* Aviso no bloqueante: los resultados locales siguen visibles (R3.5). */}
            {off.isError ? <Banner variant="error" message="No se pudo buscar en Open Food Facts." /> : null}
            {off.data?.map((f) => <FoodRow key={f.externalId} food={f} onPress={() => choose(f)} />)}
            {off.isSuccess && off.data.length === 0 ? <Text style={styles.hint}>Sin resultados.</Text> : null}
          </Section>
        </>
      ) : null}

      <Pressable
        onPress={() => router.push({ pathname: '/food-new', params: { date, meal, name: text.trim() } })}
        accessibilityRole="link"
        style={styles.createLink}
      >
        <Text style={styles.link}>¿No lo encuentras? Créalo</Text>
      </Pressable>
    </Screen>
  );
}

function Section({ title, loading, children }: { title: string; loading: boolean; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {title}
        </Text>
        {loading ? <ActivityIndicator size="small" /> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.muted, fontSize: font.small },
  section: { gap: spacing.xs },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitle: { fontSize: font.body, fontWeight: '700', color: colors.text },
  createLink: { paddingVertical: spacing.md, alignItems: 'center' },
  link: { color: colors.primary, fontWeight: '600', fontSize: font.body },
});
