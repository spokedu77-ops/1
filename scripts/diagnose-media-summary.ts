import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { BUCKET_NAME } from '../app/lib/admin/constants/storage';

loadEnvConfig(process.cwd());
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

function storagePathFromPublicUrl(value: string): string {
  const text = value.trim();
  if (!text) return '';
  if (!/^https?:\/\//i.test(text)) return text.split('?')[0]?.replace(/^\/+/, '') ?? '';
  try {
    const url = new URL(text);
    const marker = `/storage/v1/object/public/${BUCKET_NAME}/`;
    const i = url.pathname.indexOf(marker);
    if (i < 0) return '';
    return decodeURIComponent(url.pathname.slice(i + marker.length)).replace(/^\/+/, '');
  } catch {
    return '';
  }
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
  type C = { action: string; scope: string; path: string; bytes: number };
  const cands: C[] = [];

  const { data: notices } = await supabase.from('notices').select('id, content, image_urls');
  const nRef = new Set<string>();
  for (const row of notices ?? []) {
    for (const u of Array.isArray(row.image_urls) ? row.image_urls : []) {
      if (typeof u !== 'string') continue;
      const path = storagePathFromPublicUrl(u);
      if (!path.startsWith('notices/')) continue;
      nRef.add(path);
      const { data } = await supabase.storage.from(BUCKET_NAME).download(path).catch(() => ({ data: null }));
      const bytes = data ? (await data.arrayBuffer()).byteLength : 0;
      if (!data) cands.push({ action: 'recompress-ghost', scope: 'notices', path, bytes: 0 });
      else if (!(/\.webp$/i.test(path) && bytes <= 300_000))
        cands.push({ action: 'recompress', scope: 'notices', path, bytes });
    }
  }
  for (const f of await listAllFiles('notices')) {
    if (!nRef.has(f.path)) cands.push({ action: 'orphan', scope: 'notices', path: f.path, bytes: f.bytes });
  }
  for (const prefix of ['play_assets', 'flow_backgrounds'] as const) {
    for (const f of await listAllFiles(prefix)) {
      cands.push({ action: 'legacy', scope: 'legacy', path: f.path, bytes: f.bytes });
    }
  }

  const queue = cands.filter((c) => c.action !== 'skip').sort((a, b) => b.bytes - a.bytes);
  console.log('total actionable', queue.length);
  console.log('by action', Object.fromEntries(
    ['recompress', 'recompress-ghost', 'orphan', 'legacy'].map((k) => [k, queue.filter((c) => c.action === k).length]),
  ));
  console.log('\ntop 12 batch (bytes desc):');
  for (const c of queue.slice(0, 12)) console.log(c.action, c.bytes, c.path);
}

main();
