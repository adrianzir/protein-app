import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { DiaryEntry, NewDiaryEntry } from './api';
import { diaryKeys, useAddEntry, useCopyEntries } from './hooks';

const mockAddEntry = jest.fn<(e: NewDiaryEntry) => Promise<DiaryEntry>>();
const mockAddEntries = jest.fn<(e: readonly NewDiaryEntry[]) => Promise<DiaryEntry[]>>();
jest.mock('./api', () => ({
  ...jest.requireActual<typeof import('./api')>('./api'),
  addEntry: (e: NewDiaryEntry) => mockAddEntry(e),
  addEntries: (e: readonly NewDiaryEntry[]) => mockAddEntries(e),
}));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));

const food = { source: 'catalog' as const, id: 'c1', name: 'Palta', brand: null, per100g: { kcal: 160, protein: 2, carbs: 8.5, fat: 14.7 } };
const entry: DiaryEntry = {
  id: 'l1', eatenOn: '2026-10-09', mealType: 'lunch', grams: 80, food, kcal: 128, proteinG: 1.6, carbsG: 6.8, fatG: 11.76,
};

let client: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

beforeEach(() => {
  jest.useFakeTimers();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // Consultas en caché de Hoy (otro día), Recientes y Progreso.
  client.setQueryData(diaryKeys.day('2026-10-08'), []);
  client.setQueryData(diaryKeys.recent, []);
  client.setQueryData(diaryKeys.range('2026-10-09', 7), []);
  client.setQueryData(diaryKeys.entry('l1'), entry);
  client.setQueryData(['favorites'], []);
  mockAddEntry.mockResolvedValue(entry);
  mockAddEntries.mockResolvedValue([entry]);
});
afterEach(async () => {
  await cleanup();
  client.clear();
  jest.useRealTimers();
});

const invalidated = (key: readonly unknown[]) => client.getQueryState(key)?.isInvalidated;

describe('invalidación de registros (R5.4)', () => {
  it('agregar un registro invalida días, recientes y rangos, pero no favoritos', async () => {
    const { result } = await renderHook(() => useAddEntry(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ eatenOn: '2026-10-09', mealType: 'lunch', grams: 80, food });
    });
    expect(invalidated(diaryKeys.day('2026-10-08'))).toBe(true);
    expect(invalidated(diaryKeys.recent)).toBe(true);
    expect(invalidated(diaryKeys.range('2026-10-09', 7))).toBe(true);
    expect(invalidated(['favorites'])).toBe(false);
    // El detalle del registro se descarta en vez de recargarse
    expect(client.getQueryState(diaryKeys.entry('l1'))).toBeUndefined();
  });

  it('copiar registros envía las copias en un solo insert e invalida', async () => {
    const { result } = await renderHook(() => useCopyEntries(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ entries: [entry], date: '2026-10-10', mealType: 'breakfast' });
    });
    expect(mockAddEntries).toHaveBeenCalledTimes(1);
    expect(mockAddEntries.mock.calls[0][0]).toEqual([{ eatenOn: '2026-10-10', mealType: 'breakfast', grams: 80, food }]);
    expect(invalidated(diaryKeys.recent)).toBe(true);
  });
});
