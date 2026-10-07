import { readFileSync, writeFileSync } from 'node:fs';

import {
  costUsd,
  MACROS,
  type Macro,
  parseTruthCsv,
  percentile,
  predictedTotals,
  relativeError,
  summarizeErrors,
  truthTotals,
  type TruthItem,
} from './metrics.ts';
import type { PhotoAnalysis } from './schema.ts';

export type PhotoResult = {
  photo: string;
  model?: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  stopReason?: string | null;
  analysis?: PhotoAnalysis;
  error?: string;
};

export type Run = {
  startedAt: string;
  model: string;
  effort: string;
  promptVersion: string;
  results: PhotoResult[];
};

const LABEL: Record<'grams' | Macro, string> = {
  grams: 'Gramos',
  kcal: 'Calorías',
  protein: 'Proteína',
  carbs: 'Carbohidratos',
  fat: 'Grasas',
};

const pct = (x: number) => `${Math.round(x * 100)} %`;
const signed = (x: number) => `${x >= 0 ? '+' : ''}${Math.round(x * 100)} %`;
const round = (x: number) => (Math.abs(x) >= 10 ? Math.round(x) : Math.round(x * 10) / 10);

/** Informe en Markdown de una corrida, comparada con `truth.csv` si existe. */
export function buildReport(run: Run, truth: Map<string, TruthItem[]>): string {
  const ok = run.results.filter((r) => r.analysis);
  const failed = run.results.filter((r) => !r.analysis);
  const costs = run.results.map((r) => costUsd(r.model ?? run.model, r.inputTokens, r.outputTokens) ?? 0);
  const latencies = run.results.map((r) => r.latencyMs / 1000);

  const lines: string[] = [
    `# Prototipo foto con IA · ${run.startedAt}`,
    '',
    `Modelo \`${run.model}\` · esfuerzo \`${run.effort}\` · prompt ${run.promptVersion} · ${run.results.length} fotos (${failed.length} con error)`,
    '',
    '## Costo y tiempo',
    '| Métrica | Valor |',
    '|---|---|',
    `| Costo total | US$ ${sumOf(costs).toFixed(4)} |`,
    `| Costo por foto (promedio) | US$ ${(sumOf(costs) / Math.max(costs.length, 1)).toFixed(4)} |`,
    `| Tiempo por foto (mediana / p90) | ${percentile(latencies, 50).toFixed(1)} s / ${percentile(latencies, 90).toFixed(1)} s |`,
    '',
  ];

  // Error por plato frente a la balanza.
  const errors: Record<'grams' | Macro, number[]> = { grams: [], kcal: [], protein: [], carbs: [], fat: [] };
  const rows: string[] = [];
  for (const r of ok) {
    const items = truth.get(r.photo);
    if (!items || !r.analysis) continue;
    const real = truthTotals(items);
    const est = predictedTotals(r.analysis.items);
    const cells: string[] = [];
    for (const key of ['grams', ...MACROS] as const) {
      const t = real[key];
      const e = t === undefined ? undefined : relativeError(est[key], t);
      if (e !== undefined) errors[key].push(e);
      cells.push(t === undefined ? `${round(est[key])} / —` : `${round(est[key])} / ${round(t)} (${e === undefined ? '—' : signed(e)})`);
    }
    rows.push(`| ${r.photo} | ${cells.join(' | ')} |`);
  }

  lines.push('## Precisión por plato (estimado frente a balanza)');
  if (rows.length === 0) {
    lines.push('', 'Sin datos reales: completa `dataset/truth.csv` para medir el error.', '');
  } else {
    lines.push(
      '| Métrica | Platos | Error mediano | Error promedio | Sesgo | Dentro de ±20 % | Dentro de ±30 % |',
      '|---|---|---|---|---|---|---|',
    );
    for (const key of ['grams', ...MACROS] as const) {
      const s = summarizeErrors(errors[key]);
      if (s) {
        lines.push(
          `| ${LABEL[key]} | ${s.n} | ${pct(s.medianAbs)} | ${pct(s.meanAbs)} | ${signed(s.bias)} | ${pct(s.within20)} | ${pct(s.within30)} |`,
        );
      }
    }
    lines.push(
      '',
      'Sesgo positivo = el modelo sobreestima.',
      '',
      '### Detalle (estimado / real)',
      `| Foto | ${(['grams', ...MACROS] as const).map((k) => LABEL[k]).join(' | ')} |`,
      `|---|${'---|'.repeat(5)}`,
      ...rows,
      '',
    );
  }

  // Revisión manual de la identificación: lo que vio el modelo junto a lo que había.
  lines.push('## Identificación (revisión manual)', '| Foto | Real | Modelo |', '|---|---|---|');
  for (const r of run.results) {
    const real = truth.get(r.photo)?.map((i) => `${i.item} ${i.grams} g`).join('; ') ?? '—';
    const est = r.analysis
      ? r.analysis.is_food
        ? r.analysis.items.map((i) => `${i.name_es} ${Math.round(i.grams)} g (${Math.round(i.confidence * 100)} %)`).join('; ')
        : 'No es comida'
      : `Error: ${r.error ?? r.stopReason ?? 'desconocido'}`;
    lines.push(`| ${r.photo} | ${escapeCell(real)} | ${escapeCell(est)} |`);
  }
  lines.push('');
  return lines.join('\n');
}

function escapeCell(text: string): string {
  return text.replace(/\|/g, '\\|');
}

function sumOf(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

// Uso: npm run report -- results/run-XXXX.json [dataset/truth.csv]
if (import.meta.filename === process.argv[1]) {
  const [runPath, truthPath = 'dataset/truth.csv'] = process.argv.slice(2);
  if (!runPath) {
    console.error('Uso: npm run report -- results/run-XXXX.json [dataset/truth.csv]');
    process.exit(1);
  }
  const run = JSON.parse(readFileSync(runPath, 'utf8')) as Run;
  const truth = readTruth(truthPath);
  const md = buildReport(run, truth);
  const out = runPath.replace(/\.json$/, '.md');
  writeFileSync(out, md);
  console.log(md);
  console.log(`Informe guardado en ${out}`);
}

export function readTruth(path: string): Map<string, TruthItem[]> {
  try {
    return parseTruthCsv(readFileSync(path, 'utf8'));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return new Map();
    throw e;
  }
}
