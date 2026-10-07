import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';

import { prepareImage } from './image.ts';
import { PROMPT_VERSION, SYSTEM_PROMPT, USER_PROMPT } from './prompt.ts';
import { buildReport, type PhotoResult, readTruth, type Run } from './report.ts';
import { PhotoAnalysisSchema } from './schema.ts';

// Uso: npm run analyze -- [--dataset dataset] [--model claude-opus-5-5] [--effort medium] [--limit N]
const { values: args } = parseArgs({
  options: {
    dataset: { type: 'string', default: 'dataset' },
    model: { type: 'string', default: 'claude-opus-5-5' },
    effort: { type: 'string', default: 'medium' },
    limit: { type: 'string' },
  },
});

const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'] as const;
type Effort = (typeof EFFORTS)[number];
const effort = args.effort as Effort;
if (!EFFORTS.includes(effort)) {
  console.error(`--effort debe ser uno de: ${EFFORTS.join(', ')}`);
  process.exit(1);
}

const photos = readdirSync(args.dataset)
  .filter((f) => /\.(jpe?g|png|webp|heic|heif)$/i.test(f))
  .sort()
  .slice(0, args.limit ? Number(args.limit) : undefined);
if (photos.length === 0) {
  console.error(`No hay fotos en ${args.dataset}/ (jpg, png, webp o heic).`);
  process.exit(1);
}

// Credenciales desde ANTHROPIC_API_KEY (o un perfil de `ant auth login`).
const client = new Anthropic();
const format = betaZodOutputFormat(PhotoAnalysisSchema);

async function analyzePhoto(photo: string): Promise<PhotoResult> {
  const started = Date.now();
  try {
    const image = await prepareImage(join(args.dataset, photo));
    const response = await client.beta.messages.parse({
      model: args.model,
      max_tokens: 16000,
      // Si el modelo declina por política, la API reintenta con un modelo de respaldo.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort, format },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image.base64 } },
            { type: 'text', text: USER_PROMPT },
          ],
        },
      ],
    });
    const base = {
      photo,
      model: response.model,
      latencyMs: Date.now() - started,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      stopReason: response.stop_reason,
    };
    if (response.stop_reason === 'refusal') return { ...base, error: 'El modelo declinó la foto' };
    if (!response.parsed_output) return { ...base, error: `Respuesta sin JSON válido (${response.stop_reason})` };
    return { ...base, analysis: response.parsed_output };
  } catch (e) {
    const message =
      e instanceof Anthropic.AuthenticationError
        ? 'Falta o no es válida ANTHROPIC_API_KEY'
        : e instanceof Anthropic.APIError
          ? `API ${e.status}: ${e.message}`
          : e instanceof Error
            ? e.message
            : String(e);
    return { photo, latencyMs: Date.now() - started, inputTokens: 0, outputTokens: 0, error: message };
  }
}

const run: Run = {
  startedAt: new Date().toISOString(),
  model: args.model,
  effort,
  promptVersion: PROMPT_VERSION,
  results: [],
};

for (const [i, photo] of photos.entries()) {
  const result = await analyzePhoto(photo);
  run.results.push(result);
  const summary = result.analysis
    ? result.analysis.items.map((it) => `${it.name_es} ${Math.round(it.grams)} g`).join(', ') || 'sin alimentos'
    : `ERROR ${result.error}`;
  console.log(`[${i + 1}/${photos.length}] ${photo} · ${(result.latencyMs / 1000).toFixed(1)} s · ${summary}`);
}

mkdirSync('results', { recursive: true });
const stamp = run.startedAt.replace(/[:.]/g, '-');
const jsonPath = `results/run-${stamp}.json`;
writeFileSync(jsonPath, JSON.stringify(run, null, 2));
const md = buildReport(run, readTruth(join(args.dataset, 'truth.csv')));
writeFileSync(jsonPath.replace(/\.json$/, '.md'), md);
console.log(`\n${md}\nResultados en ${jsonPath} y ${jsonPath.replace(/\.json$/, '.md')}`);
