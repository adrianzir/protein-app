import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Banner } from '@/components/Banner';
import { FoodRow } from '@/components/FoodRow';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { colors, font, spacing } from '@/components/theme';
import { useRecentFoods } from '@/features/diary/hooks';
import { parseDateParam, parseMealParam } from '@/features/diary/params';
import { useFavorites } from '@/features/favorites/hooks';
import { MIN_QUERY_LENGTH } from '@/features/foods/api';
import { useLocalFoodSearch, useOffSearch } from '@/features/foods/hooks';
import { foodKey } from '@/features/foods/key';
import { lastGramsFor } from '@/features/foods/recents';
import type { FoodRef } from '@/features/foods/types';
import { encodeFoodParam } from '@/features/foods/validation';
import { formatGrams } from '@/lib/format';
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

  const favorites = useFavorites();
  const recents = useRecentFoods();
  const favoriteKeys = favorites.data?.keys;
  const isFavorite = (food: FoodRef) => favoriteKeys?.has(foodKey(food)) ?? false;

  // Desde Recientes y Favoritos, Registrar parte con los gramos de la última vez (R1.3, R2.3).
  const choose = (food: FoodRef, grams?: number) =>
    router.push({
      pathname: '/log/new',
      params: { date, meal, food: encodeFoodParam(food), ...(grams ? { grams: String(grams) } : {}) },
    });

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

      <Pressable
        onPress={() => router.push({ pathname: '/scan', params: { date, meal } })}
        accessibilityRole="button"
        style={styles.scanButton}
      >
        <Ionicons name="barcode-outline" size={22} color={colors.primary} />
        <Text style={styles.link}>Escanear código</Text>
      </Pressable>

      {!ready ? (
        <>
          <Text style={styles.hint}>Escribe al menos {MIN_QUERY_LENGTH} letras para buscar.</Text>

          {/* Si fallan, solo no se muestran: la búsqueda sigue disponible (diseño §7). */}
          {favorites.data && favorites.data.list.length > 0 ? (
            <Section title="Favoritos" loading={false}>
              {favorites.data.list.map((f) => (
                <FoodRow
                  key={f.key}
                  food={f.food}
                  favorite
                  onPress={() => choose(f.food, lastGramsFor(f.key, recents.data ?? []))}
                />
              ))}
            </Section>
          ) : null}

          {recents.data && recents.data.length > 0 ? (
            <Section title="Recientes" loading={false}>
              {recents.data.map((r) => (
                <FoodRow
                  key={r.key}
                  food={r.food}
                  favorite={isFavorite(r.food)}
                  subtitle={`Última vez: ${formatGrams(r.lastGrams)} g`}
                  onPress={() => choose(r.food, r.lastGrams)}
                />
              ))}
            </Section>
          ) : null}
        </>
      ) : null}

      {ready ? (
        <>
          <Section title="Mis alimentos y catálogo" loading={local.isFetching}>
            {local.isError ? (
              <Banner variant="error" message="No se pudo buscar en tus alimentos." actionLabel="Reintentar" onAction={() => local.refetch()} />
            ) : null}
            {local.data?.map((f) => (
              <FoodRow key={f.id} food={f} favorite={isFavorite(f)} onPress={() => choose(f)} />
            ))}
            {local.isSuccess && local.data.length === 0 ? <Text style={styles.hint}>Sin resultados.</Text> : null}
          </Section>

          <Section title="Open Food Facts" loading={off.isFetching}>
            {/* Aviso no bloqueante: los resultados locales siguen visibles (R3.5). */}
            {off.isError ? <Banner variant="error" message="No se pudo buscar en Open Food Facts." /> : null}
            {off.data?.map((f) => (
              <FoodRow key={f.externalId} food={f} favorite={isFavorite(f)} onPress={() => choose(f)} />
            ))}
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
  scanButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 },
  link: { color: colors.primary, fontWeight: '600', fontSize: font.body },
});
