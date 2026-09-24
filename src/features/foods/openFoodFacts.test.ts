import { afterEach, describe, expect, it, jest } from '@jest/globals';

import fixture from './__fixtures__/off-search.json';
import { buildOffSearchUrl, OffError, OFF_USER_AGENT, parseOffProducts, searchOff } from './openFoodFacts';

describe('buildOffSearchUrl', () => {
  it('codifica el término y pide solo los campos necesarios', () => {
    const url = new URL(buildOffSearchUrl(' pan de molde '));
    expect(url.searchParams.get('search_terms')).toBe('pan de molde');
    expect(url.searchParams.get('page_size')).toBe('20');
    expect(url.searchParams.get('fields')).toBe('code,product_name,product_name_es,brands,nutriments');
  });
});

describe('parseOffProducts', () => {
  const foods = parseOffProducts(fixture);

  it('descarta incompletos, sin nombre, imposibles y duplicados', () => {
    expect(foods.map((f) => f.externalId)).toEqual(['7802800716500', '8410000000001']);
  });

  it('prefiere product_name_es y toma la primera marca', () => {
    expect(foods[0]).toEqual({
      source: 'off',
      externalId: '7802800716500',
      name: 'Yogur batido frutilla',
      brand: 'Soprole',
      per100g: { kcal: 95, protein: 3.2, carbs: 15.1, fat: 2.5 },
    });
  });

  it('acepta números como texto y redondea a 1 decimal; marca vacía → null', () => {
    expect(foods[1].per100g).toEqual({ kcal: 120.4, protein: 6, carbs: 4.1, fat: 9.6 });
    expect(foods[1].brand).toBeNull();
  });

  it('respuestas inesperadas devuelven lista vacía', () => {
    expect(parseOffProducts(null)).toEqual([]);
    expect(parseOffProducts({ products: 'x' })).toEqual([]);
    expect(parseOffProducts({ products: [null, 1, 'a'] })).toEqual([]);
  });
});

describe('searchOff', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  const okResponse = (body: unknown) =>
    ({ ok: true, status: 200, json: async () => body }) as unknown as Response;

  it('devuelve alimentos y envía el User-Agent', async () => {
    const fetchImpl = jest.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => okResponse(fixture));
    const foods = await searchOff('yogur', { fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(foods).toHaveLength(2);
    const init = fetchImpl.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['User-Agent']).toBe(OFF_USER_AGENT);
  });

  it('error HTTP (p. ej. 429) → OffError http', async () => {
    const fetchImpl = (async () => ({ ok: false, status: 429 }) as Response) as typeof fetch;
    await expect(searchOff('yogur', { fetchImpl })).rejects.toMatchObject({ reason: 'http', status: 429 });
  });

  it('fallo de red → OffError network', async () => {
    const fetchImpl = (async () => {
      throw new TypeError('Network request failed');
    }) as typeof fetch;
    await expect(searchOff('yogur', { fetchImpl })).rejects.toMatchObject({ reason: 'network' });
  });

  it('JSON inválido → OffError parse', async () => {
    const fetchImpl = (async () =>
      ({ ok: true, status: 200, json: async () => { throw new SyntaxError('bad'); } }) as unknown as Response) as typeof fetch;
    await expect(searchOff('yogur', { fetchImpl })).rejects.toMatchObject({ reason: 'parse' });
  });

  // fetch que respeta el AbortSignal y nunca responde por sí solo
  const hangingFetch = ((_url: RequestInfo | URL, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    })) as typeof fetch;

  it('tiempo agotado → OffError timeout', async () => {
    jest.useFakeTimers();
    const promise = searchOff('yogur', { fetchImpl: hangingFetch, timeoutMs: 8000 });
    jest.advanceTimersByTime(8000);
    await expect(promise).rejects.toBeInstanceOf(OffError);
    await expect(promise).rejects.toMatchObject({ reason: 'timeout' });
  });

  it('cancelación del llamador → rechaza sin OffError', async () => {
    const controller = new AbortController();
    const promise = searchOff('yogur', { fetchImpl: hangingFetch, signal: controller.signal });
    controller.abort();
    await expect(promise).rejects.not.toBeInstanceOf(OffError);
  });
});
