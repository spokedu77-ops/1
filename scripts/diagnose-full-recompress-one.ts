import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';

loadEnvConfig(process.cwd());
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

const item = {
  path: 'spokedu-master/spomove-thumbnails/simon-pole-arrows-41/thumbnail.png',
  bytes: 1476644,
  presetId: 'simon-pole-arrows-41',
};

async function main() {
  const { data: blob, error: dlError } = await supabase.storage.from('iiwarmup-files').download(item.path);
  console.log('download', dlError?.message ?? blob?.size);

  const { default: sharp } = await import('sharp');
  const input = Buffer.from(await blob!.arrayBuffer());
  const meta = await sharp(input).metadata();
  console.log('dimensions', meta.width, meta.height, meta.format);

  const output = await sharp(input)
    .rotate()
    .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  console.log('output bytes', output.byteLength, 'smaller?', output.byteLength < item.bytes);

  const testPath = `spokedu-master/spomove-thumbnails/${item.presetId}/thumbnail-recompress-test.webp`;
  const { error: upError } = await supabase.storage.from('iiwarmup-files').upload(testPath, output, {
    contentType: 'image/webp',
    upsert: true,
  });
  console.log('upload test', upError?.message ?? 'ok');
  if (!upError) await supabase.storage.from('iiwarmup-files').remove([testPath]);
}

main();
