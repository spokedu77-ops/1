import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';

loadEnvConfig(process.cwd());
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

const paths = [
  'notices/1771082204940_NightSkyHDRI008_8K_HDR.webp',
  'flow_backgrounds/pano/myersalex216-space-2638158_1920.jpg',
];

async function main() {
  for (const path of paths) {
    const { data, error } = await supabase.storage.from('iiwarmup-files').download(path);
    console.log(path, 'download', error?.message ?? `ok ${data?.size} bytes`);
    if (!data) continue;
    const buf = Buffer.from(await data.arrayBuffer());
    try {
      const { default: sharp } = await import('sharp');
      const t0 = Date.now();
      const out = await sharp(buf)
        .rotate()
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();
      console.log('  sharp ok →', out.length, 'bytes in', Date.now() - t0, 'ms');
    } catch (e) {
      console.log('  sharp FAIL', e instanceof Error ? e.message : e);
    }
  }
}

main();
