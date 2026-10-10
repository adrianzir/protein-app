import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { pickRecents, RECENTS_DAYS } from '@/features/foods/recents';
import { dailyTotals, periodDays } from '@/features/progress/stats';
import { addDays, toLocalISODate, type ISODate } from '@/lib/date';

import {
  addEntries,
  addEntry,
  copiesOf,
  deleteEntry,
  fetchDayEntries,
  fetchEntry,
  fetchRangeRows,
  fetchRecentEntries,
  updateEntry,
  type DiaryEntry,
  type DiaryEntryPatch,
} from './api';
import type { MealType } from './macros';

// Todas las consultas de registros comparten el prefijo 'logs' (Spec 004 · R5.4).
export const diaryKeys = {
  all: ['logs'] as const,
  day: (date: ISODate) => ['logs', date] as const,
  entry: (id: string) => ['logs', 'entry', id] as const,
  recent: ['logs', 'recent'] as const,
  range: (end: ISODate, length: number) => ['logs', 'range', end, length] as const,
};

export function useDayEntries(date: ISODate) {
  return useQuery({ queryKey: diaryKeys.day(date), queryFn: () => fetchDayEntries(date) });
}

export function useEntry(id: string) {
  return useQuery({ queryKey: diaryKeys.entry(id), queryFn: () => fetchEntry(id) });
}

/** Alimentos registrados en los últimos 30 días, sin repetir (Spec 004 · R1). */
export function useRecentFoods(today: ISODate = toLocalISODate()) {
  return useQuery({
    queryKey: diaryKeys.recent,
    queryFn: () => fetchRecentEntries(addDays(today, -(RECENTS_DAYS - 1))),
    select: (entries) => pickRecents(entries),
  });
}

/** Totales por día del período que termina en `end` (Spec 004 · R4, R5.2). */
export function useRangeTotals(end: ISODate, length: number) {
  const days = periodDays(end, length);
  return useQuery({
    queryKey: diaryKeys.range(end, length),
    queryFn: () => fetchRangeRows(days[0], end),
    select: (rows) => dailyTotals(rows, days),
  });
}

/**
 * Tras cada cambio se invalidan todas las consultas de registros: Hoy, Recientes y Progreso
 * se actualizan (Spec 001 · R6.5, Spec 004 · R5.4). Solo se recargan las que están en pantalla.
 */
function useInvalidateLogs() {
  const queryClient = useQueryClient();
  return (entries: Pick<DiaryEntry, 'id'> | readonly Pick<DiaryEntry, 'id'>[]) => {
    for (const { id } of Array.isArray(entries) ? entries : [entries]) {
      queryClient.removeQueries({ queryKey: diaryKeys.entry(id) });
    }
    return queryClient.invalidateQueries({ queryKey: diaryKeys.all });
  };
}

export function useAddEntry() {
  const invalidate = useInvalidateLogs();
  return useMutation({ mutationFn: addEntry, onSuccess: invalidate });
}

export function useUpdateEntry() {
  const invalidate = useInvalidateLogs();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: DiaryEntryPatch }) => updateEntry(id, patch),
    onSuccess: invalidate,
  });
}

export function useDeleteEntry() {
  const invalidate = useInvalidateLogs();
  return useMutation({
    mutationFn: async (entry: DiaryEntry) => {
      await deleteEntry(entry.id);
      return entry;
    },
    onSuccess: invalidate,
  });
}

/** Copia registros (p. ej. los de ayer) a un día y tipo de comida: todos o ninguno (Spec 004 · R3.3). */
export function useCopyEntries() {
  const invalidate = useInvalidateLogs();
  return useMutation({
    mutationFn: ({ entries, date, mealType }: { entries: readonly DiaryEntry[]; date: ISODate; mealType: MealType }) =>
      addEntries(copiesOf(entries, date, mealType)),
    onSuccess: invalidate,
  });
}
