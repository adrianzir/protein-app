import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { parseArgs } from 'node:util';

import { prepareImage } from './image.ts';
import { PROMPT_VERSION } from './prompt.ts';
import {
  type AnalyzerOptions,
  createAnalyzer,
  errorStatus,
  isProviderId,
  isRetryable,
  PROVIDERS,
} from './providers.ts';
import { buildReport, type PhotoResult, readTruth, type Run } from './report.ts';

// Uso: npm run analyze -- [--provider gemini] [--model …] [--dataset dataset] [--limit N] [--delay ms]
const { values: args } = parseArgs({
  options: {
    provider: { type: 'string', default: 'gemini' },
    model: { type: 'string' },
    dataset: { type: 'string', default: 'dataset' },
    limit: { type: 'string' },
    delay: { type: 'string', default: '0' },
    effort: { type: 'string', default: 'medium' },
    json: { type: 'string', default: 'schema' },
    'list-models': { type: 'boolean', default: false },
  },
});

const fail = (message: string): never => {
  console.error(message);
  process.exit(1);
};

const provider = isProviderId(args.provider)
  ? args.provider
  : fail(`--provider debe ser uno de: ${Object.keys(PROVIDERS).join(', ')}`);
const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'] as const;
const effort = EFFORTS.find((e) => e === args.effort) ?? fail(`--effort debe ser uno de: ${EFFORTS.join(', ')}`);
const json = args.json === 'schema' || args.json === 'object' ? args.json : fail('--json debe ser schema u object');
const options: AnalyzerOptions = { model: args.model ?? PROVIDERS[provider].defaultModel, effort, json };

let analyzer: ReturnType<typeof createAnalyzer>;
try {
  analyzer = createAnalyzer(provider, options);
} catch (e) {
  fail((e as Error).message);
}

if (args['list-models']) {
  const models = await analyzer!.listModels();
  console.log(models.join('\n'));
  process.exit(0);
}

const photos = readdirSync(args.dataset)
  .filter((f) => /\.(jpe?g|png|webp|heic|heif)$/i.test(f))
  .sort()
  .slice(0, args.limit ? Number(args.limit) : undefined);
if (photos.length === 0) fail(`No hay fotos en ${args.dataset}/ (jpg, png, webp o heic).`);

// Los planes gratuitos limitan las solicitudes por minuto: reintenta 429 y 5xx con espera creciente.
const RETRIES = 3;

async function analyzePhoto(photo: string): Promise<PhotoResult> {
  const image = await prepareImage(join(args.dataset, photo));
  for (let attempt = 0; ; attempt++) {
    // El tiempo se mide por intento: las esperas por límite de uso no cuentan.
    const started = Date.now();
    try {
      const outcome = await analyzer!.analyze(image);
      return { photo, latencyMs: Date.now() - started, ...outcome };
    } catch (e) {
      if (isRetryable(e) && attempt < RETRIES) {
        const wait = 5_000 * 2 ** attempt;
        console.log(`  ${photo}: error ${errorStatus(e)}, reintento en ${wait / 1000} s`);
        await sleep(wait);
        continue;
      }
      const status = errorStatus(e);
      const message = status === 401 || status === 403 ? 'Clave inválida o sin permiso' : (e as Error).message;
      return {
        photo,
        model: options.model,
        latencyMs: Date.now() - started,
        inputTokens: 0,
        outputTokens: 0,
        error: status ? `HTTP ${status}: ${message}` : message,
      };
    }
  }
}

const run: Run = {
  startedAt: new Date().toISOString(),
  provider,
  model: options.model,
  effort: provider === 'claude' ? effort : '—',
  promptVersion: PROMPT_VERSION,
  results: [],
};

for (const [i, photo] of photos.entries()) {
  if (i > 0 && Number(args.delay) > 0) await sleep(Number(args.delay));
  const result = await analyzePhoto(photo);
  run.results.push(result);
  const summary = result.analysis
    ? result.analysis.items.map((it) => `${it.name_es} ${Math.round(it.grams)} g`).join(', ') || 'sin alimentos'
    : `ERROR ${result.error}`;
  console.log(`[${i + 1}/${photos.length}] ${photo} · ${(result.latencyMs / 1000).toFixed(1)} s · ${summary}`);
}

mkdirSync('results', { recursive: true });
const stamp = run.startedAt.replace(/[:.]/g, '-');
const jsonPath = `results/run-${stamp}-${provider}.json`;
writeFileSync(jsonPath, JSON.stringify(run, null, 2));
const md = buildReport(run, readTruth(join(args.dataset, 'truth.csv')));
writeFileSync(jsonPath.replace(/\.json$/, '.md'), md);
console.log(`\n${md}\nResultados en ${jsonPath} y ${jsonPath.replace(/\.json$/, '.md')}`);
