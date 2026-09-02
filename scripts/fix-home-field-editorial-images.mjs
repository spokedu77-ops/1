/**
 * Bake Home field-editorial WebP assets from explicit local originals.
 * Never re-encode an existing production derivative as if it were a source.
 *
 * Usage: node scripts/fix-home-field-editorial-images.mjs
 *
 * Hero original (gitignored staging — do not commit 4MB+ originals to public/):
 *   assets-source/spokedu/home/KakaoTalk_Photo_2026-08-10-17-42-37_18_.jpeg
 * Provenance: 서울위례초 2026.08.10 배구형 스포츠 — Drive ID 1CvUlPEbLJLSz1t39ivmbt2UZYtzKveDO
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
const HERO_ORIGINAL = path.join(
  ROOT,
  'assets-source/spokedu/home/KakaoTalk_Photo_2026-08-10-17-42-37_18_.jpeg',
);

const WEBP = { quality: 86, effort: 4 };

/** @type {Array<{ role: string; source: string; output: string; targetWidth: number; quality?: number; withoutEnlargement?: boolean; resize?: { width: number; height: number } }>} */
const MANIFEST = [
  {
    role: 'hero',
    source: HERO_ORIGINAL,
    output: path.join(OUT, 'home-hero-field.webp'),
    targetWidth: 2400,
    quality: 86,
    withoutEnlargement: true,
  },
  {
    role: 'spomove',
    source: path.join(HOME, 'home-hero-spomove-class.JPG'),
    output: path.join(OUT, 'home-spomove-field.webp'),
    targetWidth: 2400,
    withoutEnlargement: true,
  },
  {
    role: 'case-general',
    source: path.join(RECORDS, 'maedong-sports-stepup.jpg'),
    output: path.join(OUT, 'home-case-general.webp'),
    targetWidth: 1600,
    withoutEnlargement: true,
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
    withoutEnlargement: true,
  },
];

async function writeWebpFrom(entry) {
  if (!entry.source || !existsSync(entry.source)) {
    const hint =
      entry.role === 'hero'
        ? ` missing Hero original — place file at assets-source/spokedu/home/KakaoTalk_Photo_2026-08-10-17-42-37_18_.jpeg (Drive ID 1CvUlPEbLJLSz1t39ivmbt2UZYtzKveDO)`
        : '';
    console.warn(`SKIP ${entry.role}: missing source ${entry.source ?? '(null)'}${hint}`);
    return;
  }

  const srcMeta = await sharp(entry.source).metadata();
  if (entry.role === 'hero' && (srcMeta.width ?? 0) < 2200) {
    throw new Error(
      `Hero source too small: ${srcMeta.width}x${srcMeta.height} — refuse bake (need ≥2200px original, not web derivative)`,
    );
  }
  if (entry.role === 'hero' && path.extname(entry.source).toLowerCase() === '.webp') {
    throw new Error('Hero source must not be WebP derivative — refuse webp→webp');
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
      withoutEnlargement: entry.withoutEnlargement !== false,
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
    `OK ${path.relative(ROOT, entry.output)} ← ${path.relative(ROOT, entry.source)} (${srcMeta.width}x${srcMeta.height}) → ${meta.width}x${meta.height} (${sizeKb}KB)`,
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
