#!/usr/node/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const docsDir = path.dirname(fileURLToPath(import.meta.url));
const cap = path.join(docsDir, 'captures');

async function sideBySide(before, after, out, labelW = 390) {
  const b = sharp(before);
  const a = sharp(after);
  const mb = await b.metadata();
  const ma = await a.metadata();
  const h = Math.max(mb.height ?? 0, ma.height ?? 0);
  const resize = (img, meta) =>
    sharp(img).resize({ height: h, fit: 'contain', background: '#fff' }).toBuffer();
  const [bb, ab] = await Promise.all([resize(before, mb), resize(after, ma)]);
  const wb = (await sharp(bb).metadata()).width ?? labelW;
  const wa = (await sharp(ab).metadata()).width ?? labelW;
  await sharp({
    create: { width: wb + wa + 8, height: h, channels: 3, background: '#f5f5f5' },
  })
    .composite([
      { input: bb, left: 0, top: 0 },
      { input: ab, left: wb + 8, top: 0 },
    ])
    .png()
    .toFile(out);
}

await sideBySide(
  path.join(cap, 'hero-before-390.png'),
  path.join(cap, 'hero-390.png'),
  path.join(cap, 'hero-before-after-390.png'),
);
await sideBySide(
  path.join(cap, 'hero-before-1440.png'),
  path.join(cap, 'hero-1440.png'),
  path.join(cap, 'hero-before-after-1440.png'),
);
console.log('composed before-after');
