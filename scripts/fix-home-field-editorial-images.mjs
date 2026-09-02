/**
 * Bake Home field-editorial WebP assets from explicit local originals.
 * Never re-encode an existing production derivative as if it were a source.
 *
 * Usage: node scripts/fix-home-field-editorial-images.mjs
 */
import { existsSync } from 'fs';
import { rename, unlink } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'public/images/spokedu/home/field-editorial');
const HOME = path.join(ROOT, 'public/images/spokedu/home');
const RECORDS = path.join(ROOT, 'public/images/spokedu/records');
const SUB = path.join(ROOT, 'public/images/spokedu/subscription');

const WEBP = { quality: 86, effort: 4 };

/** @type {Array<{ role: string; source: string | null; output: string; targetWidth: number; quality?: number; resize?: { width: number; height: number }; skip?: string }>} */
const MANIFEST = [
  {
    role: 'hero',
    source: null,
    output: path.join(OUT, 'home-hero-field.webp'),
    targetWidth: 2400,
    skip: 'ASSET SOURCE REQUIRED — no high-res original for 서울위례초 Hero in repo; do not webp→webp',
  },
  {
    role: 'spomove',
    source: path.join(HOME, 'home-hero-spomove-class.JPG'),
    output: path.join(OUT, 'home-spomove-field.webp'),
    targetWidth: 2400,
  },
  {
    role: 'case-general',
    source: path.join(RECORDS, 'maedong-sports-stepup.jpg'),
    output: path.join(OUT, 'home-case-general.webp'),
    targetWidth: 1600,
  },
  {
    role: 'case-adapted',
    source: path.join(RECORDS, 'donghaeng-special-pe-field.jpg'),
    output: path.join(OUT, 'home-case-adapted.webp'),
    targetWidth: 1200,
    resize: { width: 1200, height: 900 },
  },
  {
    role: 'case-spomove',
    source: path.join(RECORDS, 'dongjak-spomove.jpg'),
    output: path.join(OUT, 'home-case-spomove.webp'),
    targetWidth: 1600,
  },
];

async function writeWebpFrom(entry) {
  if (entry.skip) {
    console.warn(`SKIP ${entry.role}: ${entry.skip}`);
    return;
  }
  if (!entry.source || !existsSync(entry.source)) {
    console.warn(`SKIP ${entry.role}: missing source ${entry.source ?? '(null)'}`);
    return;
  }

  let pipeline = sharp(entry.source).rotate();
  if (entry.resize) {
    pipeline = pipeline.resize(entry.resize.width, entry.resize.height, {
      fit: 'cover',
      position: 'centre',
    });
  } else {
    pipeline = pipeline.resize(entry.targetWidth, null, {
      fit: 'inside',
      withoutEnlargement: false,
    });
  }

  const buffer = await pipeline.webp({ ...WEBP, quality: entry.quality ?? WEBP.quality }).toBuffer();
  const tempPath = `${entry.output}.rebuild`;
  await sharp(buffer).toFile(tempPath);
  await unlink(entry.output).catch(() => undefined);
  await rename(tempPath, entry.output);
  const meta = await sharp(entry.output).metadata();
  const sizeKb = Math.round((await import('fs')).statSync(entry.output).size / 1024);
  console.log(
    `OK ${path.relative(ROOT, entry.output)} ← ${path.relative(ROOT, entry.source)} → ${meta.width}x${meta.height} (${sizeKb}KB)`,
  );
}

for (const entry of MANIFEST) {
  await writeWebpFrom(entry);
}

// Subscription Home derivative — top UI only (PNG source, single encode)
if (existsSync(path.join(SUB, 'product-library.png'))) {
  const libraryMeta = await sharp(path.join(SUB, 'product-library.png')).metadata();
  const cropHeight = Math.min(libraryMeta.height ?? 430, 430);
  await sharp(path.join(SUB, 'product-library.png'))
    .extract({ left: 0, top: 0, width: libraryMeta.width ?? 1216, height: cropHeight })
    .webp(WEBP)
    .toFile(path.join(SUB, 'product-library-home.webp'));
  console.log('OK subscription/product-library-home.webp');
}
