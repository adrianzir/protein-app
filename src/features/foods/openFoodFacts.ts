import { nutrientErrors } from './validation';
import type { FoodRef } from './types';

// Spec 001 · R3.3–R3.5 y diseño §3.2

export const OFF_SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl';
export const OFF_USER_AGENT = 'ProteinApp/0.1 (Android/iOS)';
export const OFF_PAGE_SIZE = 20;
export const OFF_TIMEOUT_MS = 8000;

export class OffError extends Error {
  constructor(
    message: string,
    readonly reason: 'http' | 'timeout' | 'network' | 'parse',
    readonly status?: number,
  ) {
    super(message);
    this.name = 'OffError';
  }
}

export function buildOffSearchUrl(query: string): string {
  const params = new URLSearchParams({
    search_terms: query.trim(),
    search_simple: '1',
    json: '1',
    page_size: String(OFF_PAGE_SIZE),
    fields: 'code,product_name,product_name_es,brands,nutriments',
  });
  return `${OFF_SEARCH_URL}?${params.toString()}`;
}

const toNumber = (v: unknown): number | null => {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

const cleanText = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : null;

/**
 * Convierte la respuesta de búsqueda de OFF en alimentos. Descarta productos sin nombre,
 * sin alguno de los 4 valores por 100 g o con datos imposibles (R3.4) y quita duplicados.
 */
export function parseOffProducts(json: unknown): FoodRef[] {
  const products = (json as { products?: unknown })?.products;
  if (!Array.isArray(products)) return [];

  const seen = new Set<string>();
  const foods: FoodRef[] = [];

  for (const raw of products) {
    if (typeof raw !== 'object' || raw === null) continue;
    const p = raw as Record<string, unknown>;

    const code = cleanText(p.code);
    const name = cleanText(p.product_name_es) ?? cleanText(p.product_name);
    if (!code || !name || seen.has(code)) continue;

    const n = (p.nutriments ?? {}) as Record<string, unknown>;
    const values = {
      kcal: toNumber(n['energy-kcal_100g']),
      protein: toNumber(n.proteins_100g),
      carbs: toNumber(n.carbohydrates_100g),
      fat: toNumber(n.fat_100g),
    };
    if (Object.values(values).some((v) => v === null)) continue;

    const per100g = {
      kcal: round1(values.kcal!),
      protein: round1(values.protein!),
      carbs: round1(values.carbs!),
      fat: round1(values.fat!),
    };
    if (Object.keys(nutrientErrors(per100g)).length > 0) continue;

    seen.add(code);
    const brand = cleanText(typeof p.brands === 'string' ? p.brands.split(',')[0] : null);
    foods.push({ source: 'off', externalId: code, name, brand, per100g });
  }

  return foods;
}

type SearchOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

/** Busca en Open Food Facts. Lanza OffError si falla, se agota el tiempo o hay error HTTP. */
export async function searchOff(query: string, options: SearchOptions = {}): Promise<FoodRef[]> {
  const { signal, timeoutMs = OFF_TIMEOUT_MS, fetchImpl = fetch } = options;

  // AbortSignal.any/timeout no están disponibles en todos los motores (Hermes): se combinan a mano.
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onAbort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', onAbort);

  try {
    const res = await fetchImpl(buildOffSearchUrl(query), {
      headers: { Accept: 'application/json', 'User-Agent': OFF_USER_AGENT },
      signal: controller.signal,
    });
    if (!res.ok) throw new OffError(`Open Food Facts respondió ${res.status}`, 'http', res.status);
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      throw new OffError('Respuesta inválida de Open Food Facts', 'parse');
    }
    return parseOffProducts(json);
  } catch (e) {
    if (e instanceof OffError) throw e;
    if (timedOut) throw new OffError('Open Food Facts tardó demasiado', 'timeout');
    if (signal?.aborted) throw e; // cancelado por el llamador (p. ej. cambió el texto)
    throw new OffError('No se pudo conectar con Open Food Facts', 'network');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}
