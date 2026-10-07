/**
 * Storage recompress 실패 원인 진단 (read-only + download 시도)
 * Usage: npx tsx scripts/diagnose-storage-recompress.ts
 */
import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';

import { BUCKET_NAME } from '../app/lib/admin/constants/storage';
import {
  normalizeSpomoveThumbnailMap,
  SPOMOVE_THUMBNAIL_PACK_ID,
} from '../app/lib/spomove/spomoveOfficialAssets';

loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !serviceKey) throw new Error('Supabase env missing');

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

function decodeObjectPath(pathFromUrl: string): string {
  return pathFromUrl
    .split('/')
    .map((seg) => {
      try {
        return decodeURIComponent(seg);
      } catch {
        return seg;
      }
    })
    .join('/');
}

function normalizeStoragePath(path: string): string {
  return path.trim().replace(/^\/+/, '');
}

function storagePathFromPublicUrl(value: string): string {
  const text = value.trim();
  if (!text) return '';
  if (!/^https?:\/\//i.test(text)) {
    return normalizeStoragePath(text.split('?')[0] ?? '');
  }
  try {
    const u = new URL(text);
    const p = u.pathname;
    const publicMatch = p.match(/^\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
    if (publicMatch?.[1] === BUCKET_NAME && publicMatch[2]) {
      return normalizeStoragePath(decodeObjectPath(publicMatch[2]));
    }
    const marker = `/storage/v1/object/public/${BUCKET_NAME}/`;
    const markerIndex = p.indexOf(marker);
    if (markerIndex >= 0) {
      return normalizeStoragePath(decodeURIComponent(p.slice(markerIndex + marker.length)));
    }
    return '';
  } catch {
    return '';
  }
}

async function listAllFiles(prefix: string): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const queue = [prefix];
  while (queue.length > 0) {
    const folder = queue.shift() ?? '';
    let offset = 0;
    for (;;) {
      const { data, error } = await supabase.storage.from(BUCKET_NAME).list(folder, {
        limit: 100,
        offset,
      });
      if (error) throw new Error(`list ${folder}: ${error.message}`);
      const items = data ?? [];
      if (!items.length) break;
      for (const item of items) {
        const child = folder ? `${folder}/${item.name}` : item.name;
        if (!item.id) {
          queue.push(child);
          continue;
        }
        const bytes = Number((item as { metadata?: { size?: number } }).metadata?.size ?? 0);
        out.set(normalizeStoragePath(child), Number.isFinite(bytes) ? bytes : 0);
      }
      if (items.length < 100) break;
      offset += items.length;
    }
  }
  return out;
}

async function tryDownload(path: string): Promise<string | null> {
  const { error } = await supabase.storage.from(BUCKET_NAME).download(path);
  if (error) return error.message;
  return null;
}

async function main() {
  const [programFiles, thumbFiles, metaResult, packResult] = await Promise.all([
    listAllFiles('spokedu-master/programs'),
    listAllFiles('spokedu-master/spomove-thumbnails'),
    supabase
      .from('spokedu_master_program_meta')
      .select('curriculum_id, sm_setup_image_url')
      .not('sm_setup_image_url', 'is', null),
    supabase.from('think_asset_packs').select('assets_json').eq('id', SPOMOVE_THUMBNAIL_PACK_ID).maybeSingle(),
  ]);

  const fileIndex = new Map([...programFiles, ...thumbFiles]);
  const issues: Array<{ kind: string; path: string; issue: string; raw?: string }> = [];

  for (const row of metaResult.data ?? []) {
    const raw = String(row.sm_setup_image_url ?? '');
    const path = storagePathFromPublicUrl(raw);
    if (!path) {
      issues.push({ kind: 'setup', path: '(parse fail)', issue: 'URL→경로 추출 실패', raw: raw.slice(0, 120) });
      continue;
    }
    if (!fileIndex.has(path)) {
      issues.push({ kind: 'setup', path, issue: 'DB URL 있음 · Storage 목록에 없음', raw: raw.slice(0, 120) });
      continue;
    }
  }

  const thumbs = normalizeSpomoveThumbnailMap(packResult.data?.assets_json);
  for (const [presetId, rawPath] of Object.entries(thumbs)) {
    const path = normalizeStoragePath(storagePathFromPublicUrl(rawPath) || rawPath.split('?')[0]);
    if (!path) {
      issues.push({ kind: 'thumbnail', path: presetId, issue: '경로 비어 있음', raw: rawPath.slice(0, 120) });
      continue;
    }
    if (!fileIndex.has(path)) {
      issues.push({ kind: 'thumbnail', path, issue: `팩 preset ${presetId} · Storage 목록에 없음`, raw: rawPath.slice(0, 120) });
    }
  }

  // 고아 (storage only)
  const referenced = new Set<string>();
  for (const row of metaResult.data ?? []) {
    const p = storagePathFromPublicUrl(String(row.sm_setup_image_url ?? ''));
    if (p) referenced.add(p);
  }
  for (const p of Object.values(thumbs)) {
    const path = normalizeStoragePath(storagePathFromPublicUrl(p) || p.split('?')[0]);
    if (path) referenced.add(path);
  }

  const orphans: string[] = [];
  for (const path of fileIndex.keys()) {
    if (!referenced.has(path)) orphans.push(path);
  }

  console.log('--- Storage recompress 진단 ---');
  console.log(`program+thumb 파일 수: ${fileIndex.size}, 고아: ${orphans.length}, DB/팩 불일치: ${issues.length}`);

  if (issues.length) {
    console.log('\n[DB·팩 vs Storage 불일치] (재압축 download 실패의 주원인)');
    for (const row of issues.slice(0, 20)) {
      console.log(`  ${row.kind} | ${row.path} | ${row.issue}`);
      if (row.raw) console.log(`    raw: ${row.raw}`);
    }
  }

  // download 시도: 불일치 + 고아 상위 8
  const downloadTargets = [
    ...issues.filter((i) => i.path && i.path !== '(parse fail)').map((i) => i.path),
    ...orphans.slice(0, 12),
  ].slice(0, 12);

  if (downloadTargets.length) {
    console.log('\n[download 시도]');
    for (const path of downloadTargets) {
      const err = await tryDownload(path);
      console.log(`  ${path} → ${err ?? 'OK'}`);
    }
  }

  // 경로 정규화 mismatch 샘플: leading slash
  const slashMismatch = [...issues, ...orphans.map((p) => ({ kind: 'orphan', path: p, issue: 'orphan' }))].filter(
    (row) => row.path.startsWith('/') || !fileIndex.has(row.path),
  );
  if (orphans.length > 0 && orphans.length <= 12) {
    console.log(`\n[고아 ${orphans.length}건 — 삭제 배치 후보] download 가능 여부:`);
    for (const path of orphans) {
      const err = await tryDownload(path);
      console.log(`  ${path} → ${err ?? 'OK'}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
