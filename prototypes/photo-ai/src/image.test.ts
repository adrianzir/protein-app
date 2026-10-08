import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import sharp from 'sharp';

import { prepareImage } from './image.ts';

test('prepareImage reduce el lado mayor a 1024 px y no agranda fotos chicas', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'photo-ai-'));
  const big = join(dir, 'big.png');
  const small = join(dir, 'small.png');
  const solid = (width: number, height: number) =>
    sharp({ create: { width, height, channels: 3, background: '#c84' } });
  await solid(3000, 2000).png().toFile(big);
  await solid(640, 480).png().toFile(small);

  const a = await prepareImage(big);
  assert.deepEqual([a.width, a.height], [1024, 683]);
  assert.equal(Buffer.from(a.base64, 'base64').subarray(0, 2).toString('hex'), 'ffd8'); // JPEG
  const b = await prepareImage(small);
  assert.deepEqual([b.width, b.height], [640, 480]);
});
