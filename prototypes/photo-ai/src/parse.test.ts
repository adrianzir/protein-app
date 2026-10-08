import assert from 'node:assert/strict';
import { test } from 'node:test';

import { analysisJsonSchema, parseAnalysisText } from './parse.ts';

const item = {
  name_es: 'Arroz blanco',
  name_en: 'white rice',
  grams: 180,
  grams_low: 150,
  grams_high: 210,
  confidence: 0.9,
  kcal_100g: 130,
  protein_100g: 2.7,
  carbs_100g: 28,
  fat_100g: 0.3,
};
const valid = { is_food: true, items: [item], notes: '' };

test('parseAnalysisText acepta JSON puro y JSON dentro de un bloque con texto', () => {
  assert.deepEqual(parseAnalysisText(JSON.stringify(valid)), { analysis: valid });
  const wrapped = `Claro, aquí está:\n\`\`\`json\n${JSON.stringify(valid, null, 2)}\n\`\`\`\n¡Listo!`;
  assert.deepEqual(parseAnalysisText(wrapped), { analysis: valid });
});

test('parseAnalysisText informa respuestas vacías, sin JSON, mal formadas o fuera del esquema', () => {
  assert.deepEqual(parseAnalysisText(undefined), { error: 'Respuesta vacía' });
  assert.deepEqual(parseAnalysisText('No puedo ayudar con eso'), { error: 'La respuesta no contiene JSON' });
  assert.deepEqual(parseAnalysisText('{"is_food": true,'), { error: 'La respuesta no contiene JSON' });
  assert.deepEqual(parseAnalysisText('{"is_food": tru}'), { error: 'JSON mal formado' });
  const missing = parseAnalysisText(JSON.stringify({ ...valid, items: [{ ...item, grams: '180 g' }] }));
  assert.ok('error' in missing && missing.error.startsWith('JSON fuera del esquema: items.0.grams'));
});

test('analysisJsonSchema describe el objeto sin la clave $schema', () => {
  const schema = analysisJsonSchema();
  assert.equal(schema.$schema, undefined);
  assert.equal(schema.type, 'object');
  assert.deepEqual(schema.required, ['is_food', 'items', 'notes']);
});
