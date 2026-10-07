/**
 * 공지·기타(cleanup-iiwarmup) 실패 원인 진단
 */
import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';

import { BUCKET_NAME } from '../app/lib/admin/constants/storage';

loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !serviceKey) throw new Error('Supabase env missing');

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

function normalizeStoragePath(path: string): string {
  return path.trim().replace(/^\/+/, '');
}

function storagePathFromPublicUrl(value: string): string {
  const text = value.trim();
  if (!text) return '';
  if (!/^https?:\/\//i.test(text)) return normalizeStoragePath(text.split('?')[0] ?? '');
  try {
    const u = new URL(text);
    const marker = `/storage/v1/object/public/${BUCKET_NAME}/`;
    const i = u.pathname.indexOf(marker);
    if (i < 0) return '';
    return normalizeStoragePath(decodeURIComponent(u.pathname.slice(i + marker.length)));
  } catch {
    return '';
  }
}

async function listAllFiles(prefix: string): Promise<Array<{ path: string; bytes: number }>> {
  const out: Array<{ path: string; bytes: number }> = [];
  const queue = [prefix];
  while (queue.length > 0) {
    const folder = queue.shift() ?? '';
    let offset = 0;
    for (;;) {
      const { data, error } = await supabase.storage.from(BUCKET_NAME).list(folder, { limit: 100, offset });
      if (error) throw error;
      const items = data ?? [];
      if (!items.length) break;
      for (const item of items) {
        const child = folder ? `${folder}/${item.name}` : item.name;
        if (!item.id) {
          queue.push(child);
          continue;
        }
        const bytes = Number((item as { metadata?: { size?: number } }).metadata?.size ?? 0);
        out.push({ path: normalizeStoragePath(child), bytes: Number.isFinite(bytes) ? bytes : 0 });
      }
      if (items.length < 100) break;
      offset += items.length;
    }
  }
  return out;
}

async function objectExists(path: string): Promise<boolean> {
  const { error } = await supabase.storage.from(BUCKET_NAME).download(path);
  return !error;
}

async function trySharp(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET_NAME).download(path);
  if (error || !data) return error?.message ?? 'download fail';
  try {
    const { default: sharp } = await import('sharp');
    await sharp(Buffer.from(await data.arrayBuffer()))
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : 'sharp fail';
  }
}

async function main() {
  const recompressCandidates: Array<{ scope: string; path: string; exists: boolean }> = [];
  const orphans: Array<{ scope: string; path: string }> = [];

  // notices
  const { data: notices } = await supabase.from('notices').select('id, content, image_urls');
  const noticeRef = new Set<string>();
  for (const row of notices ?? []) {
    for (const u of Array.isArray(row.image_urls) ? row.image_urls : []) {
      if (typeof u !== 'string') continue;
      const path = storagePathFromPublicUrl(u);
      if (!path.startsWith('notices/')) continue;
      noticeRef.add(path);
      const exists = await objectExists(path);
      if (!exists) recompressCandidates.push({ scope: 'notices', path, exists: false });
    }
  }
  for (const f of await listAllFiles('notices')) {
    if (!noticeRef.has(f.path)) orphans.push({ scope: 'notices', path: f.path });
  }

  // weekly_best
  const { data: wb } = await supabase.from('weekly_best').select('id, photo_urls');
  const wbRef = new Set<string>();
  for (const row of wb ?? []) {
    for (const u of Array.isArray(row.photo_urls) ? row.photo_urls : []) {
      if (typeof u !== 'string') continue;
      const path = storagePathFromPublicUrl(u);
      if (!path.startsWith('weekly_best/')) continue;
      wbRef.add(path);
      const exists = await objectExists(path);
      if (!exists) recompressCandidates.push({ scope: 'weekly_best', path, exists: false });
    }
  }
  for (const f of await listAllFiles('weekly_best')) {
    if (!wbRef.has(f.path)) orphans.push({ scope: 'weekly_best', path: f.path });
  }

  // legacy
  for (const prefix of ['play_assets', 'flow_backgrounds'] as const) {
    for (const f of await listAllFiles(prefix)) {
      orphans.push({ scope: 'legacy', path: f.path });
    }
  }

  console.log('--- cleanup-iiwarmup 진단 ---');
  console.log(`DB 참조인데 Storage 없음 (download 실패): ${recompressCandidates.length}`);
  console.log(`고아/레거시 삭제 후보: ${orphans.length}`);

  if (recompressCandidates.length) {
    console.log('\n[幽靈 DB URL]');
    for (const row of recompressCandidates.slice(0, 15)) {
      console.log(`  ${row.scope} ${row.path}`);
    }
  }

  const batch = [
    ...recompressCandidates.map((r) => ({ action: 'recompress' as const, ...r })),
    ...orphans.map((o) => ({ action: 'delete' as const, ...o, exists: true })),
  ]
    .slice(0, 25)
    .slice(0, 8);

  const sortedOrphans = orphans.slice().sort((a, b) => a.path.localeCompare(b.path));
  const simBatch = [
    ...recompressCandidates.slice(0, 8).map((r) => ({ type: 'recompress' as const, ...r })),
    ...sortedOrphans.slice(0, 8).map((o) => ({ type: 'orphan' as const, scope: o.scope, path: o.path })),
  ].slice(0, 8);

  console.log('\n[배치 8건 시뮬레이션 (삭제/변경 없음)]');
  for (const item of simBatch) {
    if (item.type === 'recompress') {
      const { error } = await supabase.storage.from(BUCKET_NAME).download(item.path);
      console.log(`  RECOMPRESS ${item.scope} ${item.path} → ${error?.message ?? 'download OK'}`);
    } else {
      const { error } = await supabase.storage.from(BUCKET_NAME).download(item.path);
      console.log(`  ORPHAN-DELETE candidate ${item.scope} ${item.path} → download ${error?.message ?? 'OK (remove는 보통 OK)'}`);
    }
  }

  // sharp on first existing recompress from notices
  const { data: n2 } = await supabase.from('notices').select('image_urls').limit(5);
  for (const row of n2 ?? []) {
    for (const u of Array.isArray(row.image_urls) ? row.image_urls : []) {
      if (typeof u !== 'string') continue;
      const path = storagePathFromPublicUrl(u);
      if (!path.startsWith('notices/')) continue;
      const err = await trySharp(path);
      console.log(`\nsharp test ${path} → ${err ?? 'OK'}`);
      return;
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
