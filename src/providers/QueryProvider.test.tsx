import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import { QueryProvider } from './QueryProvider';

let mockUserId: string | null = null;
jest.mock('./AuthProvider', () => ({
  useAuth: () => ({ session: mockUserId ? { user: { id: mockUserId } } : null, loading: false }),
}));

let fetches = 0;
function Probe() {
  const q = useQuery({
    queryKey: ['probe'],
    queryFn: async () => {
      fetches += 1;
      return `datos-${fetches}`;
    },
  });
  const client = useQueryClient();
  return (
    <>
      <Text>{q.isPending ? 'cargando' : q.data}</Text>
      <Text>{`cache:${client.getQueryCache().getAll().length}`}</Text>
    </>
  );
}

describe('QueryProvider', () => {
  // Temporizadores falsos: los timers de limpieza de React Query (gcTime) no dejan a Jest colgado.
  beforeEach(() => {
    jest.useFakeTimers();
    fetches = 0;
    mockUserId = null;
  });
  afterEach(async () => {
    await cleanup(); // desmontar con timers falsos, antes de volver a los reales
    jest.useRealTimers();
  });

  it('al iniciar sesión las consultas de la pantalla se resuelven (no quedan colgadas)', async () => {
    const { rerender } = await render(<QueryProvider>{null}</QueryProvider>);
    mockUserId = 'user-a';
    await rerender(
      <QueryProvider>
        <Probe />
      </QueryProvider>,
    );
    await waitFor(() => expect(screen.getByText('datos-1')).toBeTruthy());
  });

  it('al cambiar de usuario limpia la caché (R7.1)', async () => {
    mockUserId = 'user-a';
    const { rerender } = await render(
      <QueryProvider>
        <Probe />
      </QueryProvider>,
    );
    await waitFor(() => expect(screen.getByText('datos-1')).toBeTruthy());

    mockUserId = null;
    await rerender(<QueryProvider>{null}</QueryProvider>);
    mockUserId = 'user-b';
    await rerender(
      <QueryProvider>
        <Probe />
      </QueryProvider>,
    );
    // user-b no ve "datos-1" de user-a: se vuelve a consultar
    await waitFor(() => expect(screen.getByText('datos-2')).toBeTruthy());
  });
});
