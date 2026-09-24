import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { toLocalISODate } from '@/lib/date';
import { useUserId } from '@/providers/AuthProvider';

import { fetchProfile, saveProfile } from './api';
import { calculateTargets } from './goals';
import type { ProfileInput } from './types';

export const profileKeys = { all: ['profile'] as const };

export function useProfile() {
  const userId = useUserId();
  return useQuery({ queryKey: profileKeys.all, queryFn: () => fetchProfile(userId) });
}

/** Guarda el perfil y recalcula las metas (R1.3, R2.4). */
export function useSaveProfile() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProfileInput) =>
      saveProfile(userId, input, calculateTargets(input, toLocalISODate())),
    onSuccess: (profile) => queryClient.setQueryData(profileKeys.all, profile),
  });
}
