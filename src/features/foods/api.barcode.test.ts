import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { createCustomFood, findOwnFoodByBarcode, type FoodRow } from './api';

// Supabase simulado: cada llamada encadenada devuelve el mismo builder; los "terminales" responden.
type Result = { data: unknown; error: { code?: string; message: string } | null };
const mockCalls: { method: string; args: unknown[] }[] = [];
let mockInsertResult: Result;
let mockSelectResult: Result;

function mockBuilder(terminal: () => Result) {
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'limit', 'insert']) {
    b[m] = (...args: unknown[]) => {
      mockCalls.push({ method: m, args });
      return b;
    };
  }
  b.single = async () => terminal();
  b.maybeSingle = async () => terminal();
  return b;
}

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: (...args: unknown[]) => {
        mockCalls.push({ method: 'select', args });
        return mockBuilder(() => mockSelectResult);
      },
      insert: (...args: unknown[]) => {
        mockCalls.push({ method: 'insert', args });
        return mockBuilder(() => mockInsertResult);
      },
    }),
  },
}));

const GTIN = '7802800716500';
const row: FoodRow = {
  id: 'f1',
  owner_id: 'u1',
  source: 'custom',
  slug: null,
  name: 'Yogur casero',
  brand: null,
  aliases: [],
  barcode: GTIN,
  kcal_100g: 95,
  protein_100g: 3.2,
  carbs_100g: 15,
  fat_100g: 2.5,
};
const input = { name: 'Yogur casero', brand: null, per100g: { kcal: 95, protein: 3.2, carbs: 15, fat: 2.5 } };

beforeEach(() => {
  mockCalls.length = 0;
});

describe('findOwnFoodByBarcode', () => {
  it('filtra por alimentos propios y código', async () => {
    mockSelectResult = { data: row, error: null };
    const food = await findOwnFoodByBarcode(GTIN);
    expect(food).toMatchObject({ source: 'custom', id: 'f1', name: 'Yogur casero' });
    expect(mockCalls).toContainEqual({ method: 'eq', args: ['source', 'custom'] });
    expect(mockCalls).toContainEqual({ method: 'eq', args: ['barcode', GTIN] });
  });

  it('sin resultado → null; error → lanza', async () => {
    mockSelectResult = { data: null, error: null };
    await expect(findOwnFoodByBarcode(GTIN)).resolves.toBeNull();
    mockSelectResult = { data: null, error: { message: 'caído' } };
    await expect(findOwnFoodByBarcode(GTIN)).rejects.toMatchObject({ message: 'caído' });
  });
});

describe('createCustomFood con código', () => {
  it('guarda el código de barras (R4.2)', async () => {
    mockInsertResult = { data: row, error: null };
    await createCustomFood('u1', input, GTIN);
    const insert = mockCalls.find((c) => c.method === 'insert');
    expect(insert?.args[0]).toMatchObject({ barcode: GTIN, source: 'custom', owner_id: 'u1' });
  });

  it('sin código guarda null', async () => {
    mockInsertResult = { data: { ...row, barcode: null }, error: null };
    await createCustomFood('u1', input);
    expect(mockCalls.find((c) => c.method === 'insert')?.args[0]).toMatchObject({ barcode: null });
  });

  it('código duplicado (23505) → devuelve el alimento existente (R4.3)', async () => {
    mockInsertResult = { data: null, error: { code: '23505', message: 'duplicate key' } };
    mockSelectResult = { data: { ...row, id: 'existente' }, error: null };
    await expect(createCustomFood('u1', input, GTIN)).resolves.toMatchObject({ id: 'existente' });
  });

  it('otros errores se propagan', async () => {
    mockInsertResult = { data: null, error: { code: '23514', message: 'check violation' } };
    await expect(createCustomFood('u1', input, GTIN)).rejects.toMatchObject({ code: '23514' });
  });
});
