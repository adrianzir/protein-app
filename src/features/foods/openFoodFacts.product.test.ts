import { afterEach, describe, expect, it, jest } from '@jest/globals';

import {
  buildOffProductUrl,
  fetchOffProduct,
  OffError,
  OFF_USER_AGENT,
  parseOffProduct,
  readServingGrams,
} from './openFoodFacts';

const GTIN = '7802800716500';

const found = {
  status: 1,
  code: GTIN,
  product: {
    code: GTIN,
    product_name: 'Strawberry yogurt',
    product_name_es: 'Yogur batido frutilla',
    brands: 'Soprole, Grupo Gloria',
    nutriments: { 'energy-kcal_100g': 95, proteins_100g: 3.2, carbohydrates_100g: 15.14, fat_100g: '2.5' },
    serving_quantity: 155,
    serving_quantity_unit: 'g',
    serving_size: '1 pote (155 g)',
  },
};

describe('buildOffProductUrl', () => {
  it('usa el endpoint v2 y pide solo los campos necesarios', () => {
    const url = new URL(buildOffProductUrl(GTIN));
    expect(url.pathname).toBe(`/api/v2/product/${GTIN}.json`);
    expect(url.searchParams.get('fields')).toContain('serving_quantity');
  });
});

describe('parseOffProduct', () => {
  it('producto completo → found con porción', () => {
    expect(parseOffProduct(found, GTIN)).toEqual({
      kind: 'found',
      food: {
        source: 'off',
        externalId: GTIN,
        name: 'Yogur batido frutilla',
        brand: 'Soprole',
        per100g: { kcal: 95, protein: 3.2, carbs: 15.1, fat: 2.5 },
        servingGrams: 155,
      },
    });
  });

  it('falta un valor → incomplete con los datos disponibles (R4.1)', () => {
    const json = {
      status: 1,
      product: { product_name: 'Galletas', brands: 'Marca', nutriments: { 'energy-kcal_100g': 480, proteins_100g: 6 } },
    };
    expect(parseOffProduct(json, GTIN)).toEqual({
      kind: 'incomplete',
      partial: { name: 'Galletas', brand: 'Marca', per100g: { kcal: 480, protein: 6 } },
    });
  });

  it('valores imposibles → incomplete, sin precargar el valor inválido', () => {
    const json = {
      status: 1,
      product: {
        product_name: 'Raro',
        nutriments: { 'energy-kcal_100g': 950, proteins_100g: 60, carbohydrates_100g: 60, fat_100g: 1 },
      },
    };
    const r = parseOffProduct(json, GTIN);
    expect(r.kind).toBe('incomplete');
    if (r.kind === 'incomplete') expect(r.partial.per100g).toEqual({ protein: 60, carbs: 60, fat: 1 });
  });

  it('sin nombre → incomplete', () => {
    const json = { status: 1, product: { nutriments: found.product.nutriments } };
    expect(parseOffProduct(json, GTIN).kind).toBe('incomplete');
  });

  it('status 0, HTTP 404 (null) o sin producto → not_found', () => {
    expect(parseOffProduct({ status: 0, status_verbose: 'product not found' }, GTIN)).toEqual({ kind: 'not_found' });
    expect(parseOffProduct(null, GTIN)).toEqual({ kind: 'not_found' });
    expect(parseOffProduct({ status: 1 }, GTIN)).toEqual({ kind: 'not_found' });
  });
});

describe('readServingGrams (R3.3)', () => {
  it('acepta gramos con unidad explícita o deducida de serving_size', () => {
    expect(readServingGrams({ serving_quantity: 30, serving_quantity_unit: 'g' })).toBe(30);
    expect(readServingGrams({ serving_quantity: '28.35', serving_size: '1 oz (28.35 g)' })).toBe(28.4);
  });

  it('ignora mililitros, unidades desconocidas y valores fuera de rango', () => {
    expect(readServingGrams({ serving_quantity: 250, serving_quantity_unit: 'ml' })).toBeUndefined();
    expect(readServingGrams({ serving_quantity: 250, serving_size: '1 vaso (250 ml)' })).toBeUndefined();
    expect(readServingGrams({ serving_quantity: 2, serving_size: '2 galletas' })).toBeUndefined();
    expect(readServingGrams({ serving_quantity: 0.5, serving_quantity_unit: 'g' })).toBeUndefined();
    expect(readServingGrams({ serving_quantity: 1500, serving_quantity_unit: 'g' })).toBeUndefined();
    expect(readServingGrams({})).toBeUndefined();
  });
});

describe('fetchOffProduct', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  const respond = (status: number, body?: unknown) =>
    (async () => ({ ok: status >= 200 && status < 300, status, json: async () => body })) as unknown as typeof fetch;

  it('200 → found y envía el User-Agent', async () => {
    const fetchImpl = jest.fn(respond(200, found));
    const r = await fetchOffProduct(GTIN, { fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(r.kind).toBe('found');
    const init = fetchImpl.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['User-Agent']).toBe(OFF_USER_AGENT);
  });

  it('HTTP 404 → not_found (no es un error de red)', async () => {
    await expect(fetchOffProduct(GTIN, { fetchImpl: respond(404) })).resolves.toEqual({ kind: 'not_found' });
  });

  it('429 y 503 → OffError http (R6.1)', async () => {
    await expect(fetchOffProduct(GTIN, { fetchImpl: respond(429) })).rejects.toMatchObject({ reason: 'http', status: 429 });
    await expect(fetchOffProduct(GTIN, { fetchImpl: respond(503) })).rejects.toMatchObject({ reason: 'http', status: 503 });
  });

  it('tiempo agotado → OffError timeout (R6.2)', async () => {
    jest.useFakeTimers();
    const hanging = ((_u: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_res, rej) => init?.signal?.addEventListener('abort', () => rej(new Error('aborted'))))) as typeof fetch;
    const promise = fetchOffProduct(GTIN, { fetchImpl: hanging, timeoutMs: 8000 });
    jest.advanceTimersByTime(8000);
    await expect(promise).rejects.toBeInstanceOf(OffError);
    await expect(promise).rejects.toMatchObject({ reason: 'timeout' });
  });
});
