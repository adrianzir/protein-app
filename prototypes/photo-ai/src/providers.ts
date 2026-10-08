import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

import type { PreparedImage } from './image.ts';
import { analysisJsonSchema, parseAnalysisText } from './parse.ts';
import { SYSTEM_PROMPT, USER_PROMPT } from './prompt.ts';
import { type PhotoAnalysis, PhotoAnalysisSchema } from './schema.ts';

export type ProviderId = 'gemini' | 'groq' | 'openrouter' | 'ollama' | 'claude';

type Preset = {
  label: string;
  /** Variable de entorno con la clave; `undefined` si no se necesita. */
  keyEnv?: string;
  defaultModel: string;
  /** API compatible con OpenAI (Groq, OpenRouter, Ollama). */
  baseURL?: string;
};

// Los modelos gratuitos cambian seguido: si uno deja de existir, lista los disponibles con --list-models.
export const PROVIDERS: Record<ProviderId, Preset> = {
  gemini: { label: 'Google Gemini (plan gratuito)', keyEnv: 'GEMINI_API_KEY', defaultModel: 'gemini-2.5-flash' },
  groq: {
    label: 'Groq (plan gratuito)',
    keyEnv: 'GROQ_API_KEY',
    defaultModel: 'meta-llama/llama-4-scout-17b-16e-instruct',
    baseURL: 'https://api.groq.com/openai/v1',
  },
  openrouter: {
    label: 'OpenRouter (modelos :free)',
    keyEnv: 'OPENROUTER_API_KEY',
    defaultModel: 'google/gemma-3-27b-it:free',
    baseURL: 'https://openrouter.ai/api/v1',
  },
  ollama: { label: 'Ollama local', defaultModel: 'qwen2.5vl:7b', baseURL: 'http://localhost:11434/v1' },
  claude: { label: 'Anthropic Claude (pago)', keyEnv: 'ANTHROPIC_API_KEY', defaultModel: 'claude-opus-5-5' },
};

export function isProviderId(value: string): value is ProviderId {
  return value in PROVIDERS;
}

export type AnalyzeOutcome = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  stopReason?: string | null;
  analysis?: PhotoAnalysis;
  error?: string;
};

export type AnalyzerOptions = {
  model: string;
  /** Solo Claude: nivel de esfuerzo. */
  effort: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  /** Solo APIs compatibles con OpenAI: `schema` exige el esquema; `object` pide JSON libre (para modelos que no soportan esquemas). */
  json: 'schema' | 'object';
};

export type Analyzer = {
  analyze(image: PreparedImage): Promise<AnalyzeOutcome>;
  listModels(): Promise<string[]>;
};

function apiKey(provider: ProviderId): string {
  const env = PROVIDERS[provider].keyEnv;
  if (!env) return 'ollama'; // Ollama no valida la clave
  const key = process.env[env];
  if (!key) throw new Error(`Falta la variable ${env} (clave de ${PROVIDERS[provider].label})`);
  return key;
}

export function createAnalyzer(provider: ProviderId, options: AnalyzerOptions): Analyzer {
  if (provider === 'claude') return claudeAnalyzer(options);
  if (provider === 'gemini') return geminiAnalyzer(options);
  return openAiCompatibleAnalyzer(provider, options);
}

function geminiAnalyzer({ model }: AnalyzerOptions): Analyzer {
  const ai = new GoogleGenAI({ apiKey: apiKey('gemini') });
  return {
    async analyze(image) {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [{ inlineData: { mimeType: 'image/jpeg', data: image.base64 } }, { text: USER_PROMPT }],
          },
        ],
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseJsonSchema: analysisJsonSchema(),
        },
      });
      const usage = response.usageMetadata;
      const stopReason = response.candidates?.[0]?.finishReason ?? null;
      return {
        model: response.modelVersion ?? model,
        inputTokens: usage?.promptTokenCount ?? 0,
        outputTokens: (usage?.candidatesTokenCount ?? 0) + (usage?.thoughtsTokenCount ?? 0),
        stopReason,
        ...parseAnalysisText(response.text),
      };
    },
    async listModels() {
      const names: string[] = [];
      for await (const m of await ai.models.list()) {
        if (m.name && m.supportedActions?.includes('generateContent')) names.push(m.name.replace(/^models\//, ''));
      }
      return names;
    },
  };
}

function openAiCompatibleAnalyzer(provider: ProviderId, { model, json }: AnalyzerOptions): Analyzer {
  // Los reintentos los maneja analyze.ts, igual para todos los proveedores.
  const client = new OpenAI({ apiKey: apiKey(provider), baseURL: PROVIDERS[provider].baseURL, maxRetries: 0 });
  const schemaHint = `Responde solo con un objeto JSON que cumpla este JSON Schema:\n${JSON.stringify(analysisJsonSchema())}`;
  return {
    async analyze(image) {
      const response = await client.chat.completions.create({
        model,
        messages: [
          // Con `object` el modelo no recibe el esquema por la API, así que va en el prompt.
          { role: 'system', content: json === 'object' ? `${SYSTEM_PROMPT}\n\n${schemaHint}` : SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image.base64}` } },
              { type: 'text', text: USER_PROMPT },
            ],
          },
        ],
        response_format:
          json === 'schema'
            ? { type: 'json_schema', json_schema: { name: 'photo_analysis', schema: analysisJsonSchema(), strict: true } }
            : { type: 'json_object' },
      });
      const choice = response.choices[0];
      return {
        model: response.model || model,
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
        stopReason: choice?.finish_reason ?? null,
        ...parseAnalysisText(choice?.message.content ?? undefined),
      };
    },
    async listModels() {
      const names: string[] = [];
      for await (const m of client.models.list()) names.push(m.id);
      return names.sort();
    },
  };
}

function claudeAnalyzer({ model, effort }: AnalyzerOptions): Analyzer {
  const client = new Anthropic({ apiKey: apiKey('claude'), maxRetries: 0 });
  const format = betaZodOutputFormat(PhotoAnalysisSchema);
  return {
    async analyze(image) {
      const response = await client.beta.messages.parse({
        model,
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
        model: response.model,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        stopReason: response.stop_reason,
      };
      if (response.stop_reason === 'refusal') return { ...base, error: 'El modelo declinó la foto' };
      if (!response.parsed_output) return { ...base, error: `Respuesta sin JSON válido (${response.stop_reason})` };
      return { ...base, analysis: response.parsed_output };
    },
    async listModels() {
      const names: string[] = [];
      for await (const m of client.models.list()) names.push(m.id);
      return names;
    },
  };
}

/** Código HTTP de un error de cualquiera de los SDK (todos exponen `status`). */
export function errorStatus(e: unknown): number | undefined {
  const status = (e as { status?: unknown })?.status;
  return typeof status === 'number' ? status : undefined;
}

/** Límite de uso (429) o falla temporal del servidor: vale la pena reintentar. */
export function isRetryable(e: unknown): boolean {
  const status = errorStatus(e);
  return status === 429 || (status !== undefined && status >= 500);
}
