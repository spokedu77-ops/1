/**
 * Re-bake Home field-editorial WebP assets with correct orientation and case provenance.
 * Usage: node scripts/fix-home-field-editorial-images.mjs
 */
import { rename, unlink } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'public/images/spokedu/home/field-editorial');
const RECORDS = path.join(ROOT, 'public/images/spokedu/records');
const SUB = path.join(ROOT, 'public/images/spokedu/subscription');

const WEBP = { quality: 88, effort: 4 };

async function writeWebpFrom(input, output, options = {}) {
  let pipeline = sharp(input);
  if (options.rotate != null) pipeline = pipeline.rotate(options.rotate);
  else pipeline = pipeline.rotate();
  if (options.resize) {
    pipeline = pipeline.resize(options.resize.width, options.resize.height, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }
  const buffer = await pipeline.webp(WEBP).toBuffer();
  const tempPath = `${output}.rebuild`;
  await sharp(buffer).toFile(tempPath);
  await unlink(output).catch(() => undefined);
  await rename(tempPath, output);
  const meta = await sharp(output).metadata();
  console.log(`OK ${path.relative(ROOT, output)} → ${meta.width}x${meta.height}`);
}

// Why: re-bake with auto-orient (pixels upright in container)
await writeWebpFrom(path.join(OUT, 'home-why-field-ed.webp'), path.join(OUT, 'home-why-field-ed.webp'));

// Hero: re-bake only (orientation OK)
await writeWebpFrom(path.join(OUT, 'home-hero-field.webp'), path.join(OUT, 'home-hero-field.webp'));

// SPOMOVE section: re-bake (orientation OK)
await writeWebpFrom(path.join(OUT, 'home-spomove-field.webp'), path.join(OUT, 'home-spomove-field.webp'));

// Cases: replace with verified record sources for slug integrity
await writeWebpFrom(
  path.join(RECORDS, 'maedong-sports-stepup.jpg'),
  path.join(OUT, 'home-case-general.webp'),
);

await writeWebpFrom(
  path.join(RECORDS, 'donghaeng-special-pe-field.jpg'),
  path.join(OUT, 'home-case-adapted.webp'),
  { resize: { width: 960, height: 960 } },
);

await writeWebpFrom(path.join(RECORDS, 'dongjak-spomove.jpg'), path.join(OUT, 'home-case-spomove.webp'), {
  resize: { width: 1280, height: 720 },
});

// Subscription Home derivative — top UI only (same screenshot, trimmed empty lower band)
const libraryMeta = await sharp(path.join(SUB, 'product-library.png')).metadata();
const cropHeight = Math.min(libraryMeta.height ?? 430, 430);
await sharp(path.join(SUB, 'product-library.png'))
  .extract({ left: 0, top: 0, width: libraryMeta.width ?? 1216, height: cropHeight })
  .webp(WEBP)
  .toFile(path.join(SUB, 'product-library-home.webp'));

console.log('OK subscription/product-library-home.webp');
