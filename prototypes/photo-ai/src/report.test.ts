import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildReport, type Run } from './report.ts';

const analysis = {
  is_food: true,
  notes: '',
  items: [
    {
      name_es: 'Arroz blanco',
      name_en: 'white rice',
      grams: 200,
      grams_low: 160,
      grams_high: 240,
      confidence: 0.9,
      kcal_100g: 130,
      protein_100g: 2.7,
      carbs_100g: 28,
      fat_100g: 0.3,
    },
  ],
};

const run = (provider: string, model: string): Run => ({
  startedAt: '2026-10-08T10:00:00.000Z',
  provider,
  model,
  effort: '—',
  promptVersion: 'v1',
  results: [
    { photo: 'a.jpg', model, latencyMs: 2000, inputTokens: 1000, outputTokens: 500, analysis },
    { photo: 'b.jpg', model, latencyMs: 4000, inputTokens: 0, outputTokens: 0, error: 'HTTP 429: límite' },
  ],
});

const truth = new Map([['a.jpg', [{ item: 'Arroz', grams: 250, kcal: 325, protein: 6.75, carbs: 70, fat: 0.75 }]]]);

test('buildReport no inventa costo para proveedores gratuitos', () => {
  const md = buildReport(run('gemini', 'gemini-2.5-flash'), truth);
  assert.match(md, /Proveedor `gemini`/);
  assert.match(md, /\| Costo total \| — \(sin precio: plan gratuito o local\) \|/);
  assert.match(md, /1 con error/);
  assert.match(md, /Error: HTTP 429: límite/);
});

test('buildReport calcula error por plato y costo de Claude', () => {
  const md = buildReport(run('claude', 'claude-opus-5-5'), truth);
  // 1000 × 4 + 500 × 20 por millón = US$ 0,014 (la foto con error no consumió tokens)
  assert.match(md, /\| Costo total \| US\$ 0\.0140 \|/);
  // 200 g estimados frente a 250 g reales = −20 %
  assert.match(md, /\| Gramos \| 1 \| 20 % \| 20 % \| -20 % \| 100 % \| 100 % \|/);
});
