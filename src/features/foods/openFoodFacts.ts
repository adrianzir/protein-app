import { nutrientErrors } from './validation';
import { SERVING_LIMITS, type FoodRef, type NutrientsPer100g } from './types';

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

/** Lee los 4 valores por 100 g de `nutriments`, redondeados a 1 decimal; null si falta o no es número. */
export function readNutriments(raw: unknown): Record<keyof NutrientsPer100g, number | null> {
  const n = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const read = (key: string) => {
    const v = toNumber(n[key]);
    return v === null ? null : round1(v);
  };
  return {
    kcal: read('energy-kcal_100g'),
    protein: read('proteins_100g'),
    carbs: read('carbohydrates_100g'),
    fat: read('fat_100g'),
  };
}

/** Los 4 valores presentes y coherentes (≥ 0, kcal ≤ 900, suma ≤ 100). */
function completeNutrients(values: Record<keyof NutrientsPer100g, number | null>): NutrientsPer100g | null {
  if (Object.values(values).some((v) => v === null)) return null;
  const per100g = values as NutrientsPer100g;
  return Object.keys(nutrientErrors(per100g)).length === 0 ? per100g : null;
}

const firstBrand = (brands: unknown) => cleanText(typeof brands === 'string' ? brands.split(',')[0] : null);

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

    const per100g = completeNutrients(readNutriments(p.nutriments));
    if (!per100g) continue;

    seen.add(code);
    foods.push({ source: 'off', externalId: code, name, brand: firstBrand(p.brands), per100g });
  }

  return foods;
}

type FetchOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

/**
 * GET a Open Food Facts con User-Agent, tiempo máximo y cancelación. Devuelve el JSON, o null si
 * `notFoundAsNull` y la respuesta es 404. Lanza OffError ante error HTTP, de red o tiempo agotado.
 */
async function fetchOffJson(
  url: string,
  { signal, timeoutMs = OFF_TIMEOUT_MS, fetchImpl = fetch }: FetchOptions,
  notFoundAsNull = false,
): Promise<unknown> {
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
    const res = await fetchImpl(url, {
      headers: { Accept: 'application/json', 'User-Agent': OFF_USER_AGENT },
      signal: controller.signal,
    });
    if (notFoundAsNull && res.status === 404) return null;
    if (!res.ok) throw new OffError(`Open Food Facts respondió ${res.status}`, 'http', res.status);
    try {
      return await res.json();
    } catch {
      throw new OffError('Respuesta inválida de Open Food Facts', 'parse');
    }
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

/** Busca en Open Food Facts. Lanza OffError si falla, se agota el tiempo o hay error HTTP. */
export async function searchOff(query: string, options: FetchOptions = {}): Promise<FoodRef[]> {
  return parseOffProducts(await fetchOffJson(buildOffSearchUrl(query), options));
}

// ── Producto por código de barras (Spec 002) ──────────────────────────────────

export const OFF_PRODUCT_URL = 'https://world.openfoodfacts.org/api/v2/product';
const PRODUCT_FIELDS =
  'code,product_name,product_name_es,brands,nutriments,serving_quantity,serving_quantity_unit,serving_size';

export function buildOffProductUrl(gtin: string): string {
  return `${OFF_PRODUCT_URL}/${encodeURIComponent(gtin)}.json?fields=${PRODUCT_FIELDS}`;
}

/** Datos parciales de un producto incompleto, para precargar el formulario (R4.1). */
export type PartialOffFood = {
  name: string | null;
  brand: string | null;
  per100g: Partial<NutrientsPer100g>;
};

export type OffProductResult =
  | { kind: 'found'; food: FoodRef }
  | { kind: 'incomplete'; partial: PartialOffFood }
  | { kind: 'not_found' };

/** Porción del envase en gramos, solo si OFF la informa en g y está en rango (R3.3). */
export function readServingGrams(p: Record<string, unknown>): number | undefined {
  const qty = toNumber(p.serving_quantity);
  if (qty === null) return undefined;
  const unit = cleanText(p.serving_quantity_unit)?.toLowerCase();
  const size = cleanText(p.serving_size)?.toLowerCase() ?? '';
  const isGrams = unit ? unit === 'g' : /\d\s*g\b/.test(size) && !/ml\b/.test(size);
  if (!isGrams || qty < SERVING_LIMITS.min || qty > SERVING_LIMITS.max) return undefined;
  return round1(qty);
}

/** Interpreta la respuesta de /api/v2/product (null = HTTP 404). */
export function parseOffProduct(json: unknown, gtin: string): OffProductResult {
  const body = (json ?? {}) as { status?: unknown; product?: unknown };
  if (json === null || body.status === 0 || typeof body.product !== 'object' || body.product === null) {
    return { kind: 'not_found' };
  }
  const p = body.product as Record<string, unknown>;
  const name = cleanText(p.product_name_es) ?? cleanText(p.product_name);
  const brand = firstBrand(p.brands);
  const values = readNutriments(p.nutriments);
  const per100g = completeNutrients(values);

  if (name && per100g) {
    const servingGrams = readServingGrams(p);
    return {
      kind: 'found',
      food: { source: 'off', externalId: gtin, name, brand, per100g, ...(servingGrams ? { servingGrams } : {}) },
    };
  }

  // Solo se precargan valores individualmente válidos.
  const partialValues: Partial<NutrientsPer100g> = {};
  for (const key of ['kcal', 'protein', 'carbs', 'fat'] as const) {
    const v = values[key];
    if (v !== null && v >= 0 && (key !== 'kcal' || v <= 900) && (key === 'kcal' || v <= 100)) {
      partialValues[key] = v;
    }
  }
  return { kind: 'incomplete', partial: { name, brand, per100g: partialValues } };
}

/** Busca un producto por GTIN en Open Food Facts. 404 → not_found; otros errores → OffError. */
export async function fetchOffProduct(gtin: string, options: FetchOptions = {}): Promise<OffProductResult> {
  return parseOffProduct(await fetchOffJson(buildOffProductUrl(gtin), options, true), gtin);
}
