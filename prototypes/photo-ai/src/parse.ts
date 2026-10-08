import { z } from 'zod';

import { type PhotoAnalysis, PhotoAnalysisSchema } from './schema.ts';

/** JSON Schema de la respuesta, para proveedores sin ayuda de Zod. */
export function analysisJsonSchema(): Record<string, unknown> {
  const { $schema: _ignored, ...schema } = z.toJSONSchema(PhotoAnalysisSchema) as Record<string, unknown>;
  return schema;
}

/**
 * Lee la respuesta de texto de un modelo y la valida con el esquema.
 * Tolera bloques ```json``` y texto alrededor, que algunos modelos gratuitos agregan.
 */
export function parseAnalysisText(text: string | undefined): { analysis: PhotoAnalysis } | { error: string } {
  if (!text?.trim()) return { error: 'Respuesta vacía' };
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return { error: 'La respuesta no contiene JSON' };
  let json: unknown;
  try {
    json = JSON.parse(text.slice(start, end + 1));
  } catch {
    return { error: 'JSON mal formado' };
  }
  const parsed = PhotoAnalysisSchema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: `JSON fuera del esquema: ${issue.path.join('.') || '(raíz)'} ${issue.message}` };
  }
  return { analysis: parsed.data };
}
