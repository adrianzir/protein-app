import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ISODate } from '@/lib/date';

import {
  addEntry,
  deleteEntry,
  fetchDayEntries,
  fetchEntry,
  updateEntry,
  type DiaryEntry,
  type DiaryEntryPatch,
} from './api';

export const diaryKeys = {
  day: (date: ISODate) => ['logs', date] as const,
  entry: (id: string) => ['logs', 'entry', id] as const,
};

export function useDayEntries(date: ISODate) {
  return useQuery({ queryKey: diaryKeys.day(date), queryFn: () => fetchDayEntries(date) });
}

export function useEntry(id: string) {
  return useQuery({ queryKey: diaryKeys.entry(id), queryFn: () => fetchEntry(id) });
}

// Tras cada cambio se invalida el día: "Hoy" se actualiza sin recargar (R6.5).
function useInvalidateDay() {
  const queryClient = useQueryClient();
  return (entry: Pick<DiaryEntry, 'id' | 'eatenOn'>) => {
    queryClient.removeQueries({ queryKey: diaryKeys.entry(entry.id) });
    return queryClient.invalidateQueries({ queryKey: diaryKeys.day(entry.eatenOn) });
  };
}

export function useAddEntry() {
  const invalidateDay = useInvalidateDay();
  return useMutation({ mutationFn: addEntry, onSuccess: invalidateDay });
}

export function useUpdateEntry() {
  const invalidateDay = useInvalidateDay();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: DiaryEntryPatch }) => updateEntry(id, patch),
    onSuccess: invalidateDay,
  });
}

export function useDeleteEntry() {
  const invalidateDay = useInvalidateDay();
  return useMutation({
    mutationFn: async (entry: DiaryEntry) => {
      await deleteEntry(entry.id);
      return entry;
    },
    onSuccess: invalidateDay,
  });
}
