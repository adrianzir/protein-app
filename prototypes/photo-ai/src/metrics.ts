import type { FoodItem } from './schema.ts';

// Funciones puras para comparar la estimación del modelo con lo pesado en la balanza.

export const MACROS = ['kcal', 'protein', 'carbs', 'fat'] as const;
export type Macro = (typeof MACROS)[number];

export type TruthItem = { item: string; grams: number } & Partial<Record<Macro, number>>;
export type Totals = { grams: number } & Partial<Record<Macro, number>>;

/** Lee `truth.csv` (photo,item,grams,kcal,protein_g,carbs_g,fat_g). Los macros pueden quedar vacíos. */
export function parseTruthCsv(text: string): Map<string, TruthItem[]> {
  const rows = text
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
    .map(parseCsvLine);
  const [header, ...data] = rows;
  if (!header) return new Map();
  const col = (name: string) => header.findIndex((h) => h.trim().toLowerCase() === name);
  const idx = {
    photo: col('photo'),
    item: col('item'),
    grams: col('grams'),
    kcal: col('kcal'),
    protein: col('protein_g'),
    carbs: col('carbs_g'),
    fat: col('fat_g'),
  };
  if (idx.photo < 0 || idx.item < 0 || idx.grams < 0) {
    throw new Error('truth.csv debe tener las columnas photo, item y grams');
  }

  const result = new Map<string, TruthItem[]>();
  data.forEach((cells, i) => {
    const photo = cells[idx.photo]?.trim();
    const grams = toNumber(cells[idx.grams]);
    if (!photo || grams === undefined) throw new Error(`truth.csv, fila ${i + 2}: falta photo o grams`);
    const row: TruthItem = { item: cells[idx.item]?.trim() ?? '', grams };
    for (const m of MACROS) {
      const v = idx[m] >= 0 ? toNumber(cells[idx[m]]) : undefined;
      if (v !== undefined) row[m] = v;
    }
    result.set(photo, [...(result.get(photo) ?? []), row]);
  });
  return result;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      cells.push(cur);
      cur = '';
    } else cur += ch;
  }
  cells.push(cur);
  return cells;
}

function toNumber(raw: string | undefined): number | undefined {
  if (raw === undefined || raw.trim() === '') return undefined;
  const n = Number(raw.trim().replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

/** Totales reales del plato. Un macro solo cuenta si todos los ítems lo tienen. */
export function truthTotals(items: TruthItem[]): Totals {
  const totals: Totals = { grams: sum(items.map((i) => i.grams)) };
  for (const m of MACROS) {
    if (items.every((i) => i[m] !== undefined)) totals[m] = sum(items.map((i) => i[m] ?? 0));
  }
  return totals;
}

/** Totales estimados: gramos × valores por 100 g de cada ítem. */
export function predictedTotals(items: FoodItem[]): Required<Totals> {
  const per = (key: keyof FoodItem) => sum(items.map((i) => (i.grams * (i[key] as number)) / 100));
  return {
    grams: sum(items.map((i) => i.grams)),
    kcal: per('kcal_100g'),
    protein: per('protein_100g'),
    carbs: per('carbs_100g'),
    fat: per('fat_100g'),
  };
}

/** Error relativo con signo (+ = sobreestima). Sin valor real positivo no hay error relativo. */
export function relativeError(predicted: number, truth: number): number | undefined {
  return truth > 0 ? (predicted - truth) / truth : undefined;
}

export type ErrorSummary = {
  n: number;
  medianAbs: number;
  meanAbs: number;
  bias: number;
  within20: number;
  within30: number;
};

export function summarizeErrors(errors: number[]): ErrorSummary | undefined {
  if (errors.length === 0) return undefined;
  const abs = errors.map(Math.abs);
  return {
    n: errors.length,
    medianAbs: percentile(abs, 50),
    meanAbs: mean(abs),
    bias: mean(errors),
    within20: abs.filter((e) => e <= 0.2).length / abs.length,
    within30: abs.filter((e) => e <= 0.3).length / abs.length,
  };
}

/** Percentil con interpolación lineal (p entre 0 y 100). */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = ((sorted.length - 1) * p) / 100;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

// Precios de la API en USD por millón de tokens (entrada, salida), octubre 2026.
const PRICES: Record<string, [number, number]> = {
  'claude-fable-5-1': [10, 50],
  'claude-opus-5-5': [4, 20],
  'claude-sonnet-5-5': [2, 10],
  'claude-haiku-5-5': [0.1, 0.5],
};

export function costUsd(model: string, inputTokens: number, outputTokens: number): number | undefined {
  const price = PRICES[model];
  return price ? (inputTokens * price[0] + outputTokens * price[1]) / 1_000_000 : undefined;
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

function mean(values: number[]): number {
  return sum(values) / values.length;
}
