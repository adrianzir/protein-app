import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AppState, Platform } from 'react-native';

import { useAuth } from './AuthProvider';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1 },
      mutations: { retry: 0 },
    },
  });
}

// En móvil, "foco" = app en primer plano: al volver se refrescan los datos vencidos.
function useAppStateFocus() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (state) => {
      focusManager.setFocused(state === 'active');
    });
    return () => sub.remove();
  }, []);
}

export function QueryProvider({ children }: PropsWithChildren) {
  const [queryClient] = useState(createQueryClient);
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const previousUserId = useRef(userId);

  useAppStateFocus();

  // Al cerrar sesión o cambiar de usuario se borra la caché: no quedan datos de otra cuenta (R7.1).
  useEffect(() => {
    if (previousUserId.current !== userId) {
      queryClient.clear();
      previousUserId.current = userId;
    }
  }, [queryClient, userId]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
