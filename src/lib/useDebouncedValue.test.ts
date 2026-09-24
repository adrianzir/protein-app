import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';

import { useDebouncedValue } from './useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('espera 400 ms sin cambios antes de actualizar', async () => {
    const { result, rerender } = await renderHook(({ v }: { v: string }) => useDebouncedValue(v, 400), {
      initialProps: { v: 'p' },
    });
    expect(result.current).toBe('p');

    await rerender({ v: 'po' });
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    await rerender({ v: 'pol' });
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    // 600 ms en total, pero solo 300 ms desde el último cambio
    expect(result.current).toBe('p');

    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current).toBe('pol');
  });
});
