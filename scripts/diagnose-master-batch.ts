import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';

import { BUCKET_NAME } from '../app/lib/admin/constants/storage';
import {
  normalizeSpomoveThumbnailMap,
  SPOMOVE_THUMBNAIL_PACK_ID,
} from '../app/lib/spomove/spomoveOfficialAssets';

loadEnvConfig(process.cwd());
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

// copy minimal logic from recompress route
function storagePathFromPublicUrl(value: string): string {
  const text = value.trim();
  if (!text) return '';
  if (!/^https?:\/\//i.test(text)) return text.split('?')[0]?.replace(/^\/+/, '') ?? '';
  try {
    const url = new URL(text);
    const marker = `/storage/v1/object/public/${BUCKET_NAME}/`;
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex < 0) return '';
    return decodeURIComponent(url.pathname.slice(markerIndex + marker.length)).replace(/^\/+/, '');
  } catch {
    return '';
  }
}

const SETUP_SKIP_BYTES = 350_000;
const THUMB_SKIP_BYTES = 200_000;

function shouldSkipRecompress(path: string, bytes: number, kind: 'setup' | 'thumbnail') {
  const isWebp = /\.webp$/i.test(path);
  const limit = kind === 'setup' ? SETUP_SKIP_BYTES : THUMB_SKIP_BYTES;
  return isWebp && bytes > 0 && bytes <= limit;
}

async function listAllFiles(prefix: string) {
  const out: Array<{ path: string; bytes: number }> = [];
  const queue = [prefix];
  while (queue.length) {
    const folder = queue.shift() ?? '';
    let offset = 0;
    for (;;) {
      const { data, error } = await supabase.storage.from(BUCKET_NAME).list(folder, { limit: 100, offset });
      if (error) throw error;
      if (!data?.length) break;
      for (const item of data) {
        const child = folder ? `${folder}/${item.name}` : item.name;
        if (!item.id) {
          queue.push(child);
          continue;
        }
        const bytes = Number((item as { metadata?: { size?: number } }).metadata?.size ?? 0);
        out.push({ path: child, bytes: Number.isFinite(bytes) ? bytes : 0 });
      }
      if (data.length < 100) break;
      offset += data.length;
    }
  }
  return out;
}

async function main() {
  const [programFiles, thumbFiles, metaResult, packResult] = await Promise.all([
    listAllFiles('spokedu-master/programs'),
    listAllFiles('spokedu-master/spomove-thumbnails'),
    supabase.from('spokedu_master_program_meta').select('curriculum_id, sm_setup_image_url').not('sm_setup_image_url', 'is', null),
    supabase.from('think_asset_packs').select('assets_json').eq('id', SPOMOVE_THUMBNAIL_PACK_ID).maybeSingle(),
  ]);

  const fileBytes = new Map<string, number>();
  for (const f of [...programFiles, ...thumbFiles]) fileBytes.set(f.path, f.bytes);

  type Cand = { kind: string; path: string; bytes: number; action: string; curriculumId?: number };
  const candidates: Cand[] = [];

  for (const row of metaResult.data ?? []) {
    const curriculumId = Number(row.curriculum_id);
    const path = storagePathFromPublicUrl(String(row.sm_setup_image_url ?? ''));
    if (!path || !Number.isFinite(curriculumId)) continue;
    const bytes = fileBytes.get(path) ?? 0;
    if (shouldSkipRecompress(path, bytes, 'setup')) {
      candidates.push({ kind: 'setup', path, bytes, action: 'skip' });
    } else {
      candidates.push({ kind: 'setup', path, bytes, action: 'recompress', curriculumId });
    }
  }

  const thumbs = normalizeSpomoveThumbnailMap(packResult.data?.assets_json);
  for (const [presetId, rawPath] of Object.entries(thumbs)) {
    const path = storagePathFromPublicUrl(rawPath) || rawPath.split('?')[0];
    const bytes = fileBytes.get(path) ?? 0;
    if (shouldSkipRecompress(path, bytes, 'thumbnail')) {
      candidates.push({ kind: 'thumbnail', path, bytes, action: 'skip' });
    } else {
      candidates.push({ kind: 'thumbnail', path, bytes, action: 'recompress' });
    }
  }

  const referenced = new Set(candidates.map((c) => c.path));
  for (const f of programFiles) {
    if (!referenced.has(f.path)) candidates.push({ kind: 'orphan', path: f.path, bytes: f.bytes, action: 'delete-orphan' });
  }

  const queue = candidates.filter((c) => c.action !== 'skip').sort((a, b) => b.bytes - a.bytes);
  console.log('actionable', queue.length, 'recompress', queue.filter((c) => c.action === 'recompress').length, 'orphan', queue.filter((c) => c.action === 'delete-orphan').length);
  console.log('top 8 batch:');
  for (const item of queue.slice(0, 8)) {
    console.log(' ', item.action, item.kind, item.bytes, item.path);
    if (item.action === 'recompress') {
      const { error } = await supabase.storage.from(BUCKET_NAME).download(item.path);
      if (error) {
        console.log('    download ERR', error.message);
        continue;
      }
      try {
        const { default: sharp } = await import('sharp');
        const { data: blob } = await supabase.storage.from(BUCKET_NAME).download(item.path);
        const input = Buffer.from(await blob!.arrayBuffer());
        await sharp(input).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
        console.log('    sharp OK');
      } catch (e) {
        console.log('    sharp ERR', e instanceof Error ? e.message : e);
      }
    }
  }
}

main();
