import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  costUsd,
  parseTruthCsv,
  percentile,
  predictedTotals,
  relativeError,
  summarizeErrors,
  truthTotals,
} from './metrics.ts';
import type { FoodItem } from './schema.ts';

const CSV = `photo,item,grams,kcal,protein_g,carbs_g,fat_g
plato01.jpg,Arroz blanco cocido,180,234,4.9,50.4,0.5
plato01.jpg,"Pollo, a la plancha",140,231,43.4,0,5
plato02.jpg,Cazuela,450,,,,
`;

test('parseTruthCsv agrupa por foto, respeta comillas y deja macros vacíos sin definir', () => {
  const truth = parseTruthCsv(CSV);
  assert.equal(truth.size, 2);
  assert.equal(truth.get('plato01.jpg')?.[1].item, 'Pollo, a la plancha');
  assert.equal(truth.get('plato01.jpg')?.[1].protein, 43.4);
  assert.deepEqual(truth.get('plato02.jpg'), [{ item: 'Cazuela', grams: 450 }]);
});

test('parseTruthCsv acepta coma decimal y exige photo, item y grams', () => {
  const truth = parseTruthCsv('photo,item,grams\na.jpg,Pan,"55,5"\n');
  assert.equal(truth.get('a.jpg')?.[0].grams, 55.5);
  assert.throws(() => parseTruthCsv('photo,grams\na.jpg,10\n'), /photo, item y grams/);
  assert.throws(() => parseTruthCsv('photo,item,grams\na.jpg,Pan,\n'), /fila 2/);
});

test('truthTotals suma macros solo si todos los ítems los tienen', () => {
  const truth = parseTruthCsv(CSV);
  const t1 = truthTotals(truth.get('plato01.jpg') ?? []);
  assert.equal(t1.grams, 320);
  assert.equal(t1.kcal, 465);
  assert.ok(Math.abs((t1.protein ?? 0) - 48.3) < 1e-9);
  const t2 = truthTotals([{ item: 'a', grams: 100, kcal: 50 }, { item: 'b', grams: 50 }]);
  assert.deepEqual(t2, { grams: 150 });
});

test('predictedTotals multiplica gramos por valores por 100 g', () => {
  const item = (grams: number, kcal: number, protein: number): FoodItem => ({
    name_es: 'x', name_en: 'x', grams, grams_low: grams, grams_high: grams, confidence: 1,
    kcal_100g: kcal, protein_100g: protein, carbs_100g: 10, fat_100g: 1,
  });
  const t = predictedTotals([item(200, 130, 2.7), item(150, 165, 31)]);
  assert.equal(t.grams, 350);
  assert.equal(t.kcal, 260 + 247.5);
  assert.ok(Math.abs(t.protein - (5.4 + 46.5)) < 1e-9);
  assert.equal(t.carbs, 35);
});

test('relativeError tiene signo y no existe con valor real 0', () => {
  assert.equal(relativeError(120, 100), 0.2);
  assert.equal(relativeError(75, 100), -0.25);
  assert.equal(relativeError(10, 0), undefined);
});

test('summarizeErrors calcula mediana, promedio, sesgo y aciertos', () => {
  const s = summarizeErrors([0.1, -0.2, 0.4, -0.05]);
  assert.ok(s);
  assert.equal(s.n, 4);
  assert.ok(Math.abs(s.medianAbs - 0.15) < 1e-9);
  assert.ok(Math.abs(s.meanAbs - 0.1875) < 1e-9);
  assert.ok(Math.abs(s.bias - 0.0625) < 1e-9);
  assert.equal(s.within20, 0.75);
  assert.equal(s.within30, 0.75);
  assert.equal(summarizeErrors([]), undefined);
});

test('percentile interpola', () => {
  assert.equal(percentile([1, 2, 3, 4], 50), 2.5);
  assert.equal(percentile([5], 90), 5);
});

test('costUsd usa el precio del modelo', () => {
  assert.equal(costUsd('claude-opus-5-5', 1_000_000, 100_000), 6);
  assert.equal(costUsd('modelo-desconocido', 1, 1), undefined);
});
