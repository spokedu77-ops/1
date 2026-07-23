/**
 * MASTER Storage 재압축·고아 정리
 * - 세팅 이미지 / SPOMOVE 썸네일: sharp WebP 재인코딩 후 교체
 * - DB에 없는 programs·thumbnails 객체 삭제
 *
 * GET  : dry-run 미리보기
 * POST : { dryRun?: boolean, limit?: number, deleteOrphans?: boolean }
 */
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { BUCKET_NAME } from '@/app/lib/admin/constants/storage';
import { devLogger } from '@/app/lib/logging/devLogger';
import {
  normalizeSpomoveThumbnailMap,
  SPOMOVE_THUMBNAIL_PACK_ID,
  SPOMOVE_THUMBNAIL_PACK_NAME,
} from '@/app/lib/spomove/spomoveOfficialAssets';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SETUP_MAX = 1600;
const SETUP_QUALITY = 85;
const SETUP_SKIP_BYTES = 350_000;
const THUMB_MAX = 1200;
const THUMB_QUALITY = 82;
const THUMB_SKIP_BYTES = 200_000;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 80;

type Kind = 'setup' | 'thumbnail' | 'orphan';

type Candidate = {
  kind: Kind;
  curriculumId?: number;
  presetId?: string;
  path: string;
  bytes: number;
  action: 'recompress' | 'delete-orphan' | 'skip';
  reason?: string;
};

type ApplyItemResult = {
  kind: Kind;
  path: string;
  nextPath?: string;
  beforeBytes: number;
  afterBytes?: number;
  status: 'ok' | 'skipped' | 'error';
  error?: string;
};

function storagePathFromPublicUrl(value: string): string {
  const text = value.trim();
  if (!text) return '';
  if (!/^https?:\/\//i.test(text)) return text.split('?')[0] ?? '';
  try {
    const url = new URL(text);
    const marker = `/storage/v1/object/public/${BUCKET_NAME}/`;
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex < 0) return '';
    return decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
  } catch {
    return '';
  }
}

function publicUrlForPath(path: string): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '');
  return `${base}/storage/v1/object/public/${BUCKET_NAME}/${path}`;
}

async function listAllFiles(
  supabase: ReturnType<typeof getServiceSupabase>,
  prefix: string
): Promise<Array<{ path: string; bytes: number }>> {
  const out: Array<{ path: string; bytes: number }> = [];
  const queue = [prefix];

  while (queue.length > 0) {
    const folder = queue.shift() ?? '';
    let offset = 0;
    for (;;) {
      const { data, error } = await supabase.storage.from(BUCKET_NAME).list(folder, {
        limit: 100,
        offset,
      });
      if (error) throw new Error(`Storage list 실패 (${folder || '/'}): ${error.message}`);
      const items = data ?? [];
      if (!items.length) break;

      for (const item of items) {
        const child = folder ? `${folder}/${item.name}` : item.name;
        if (!item.id) {
          queue.push(child);
          continue;
        }
        const bytes = Number(
          (item as { metadata?: { size?: number | string } | null }).metadata?.size ?? 0
        );
        out.push({ path: child, bytes: Number.isFinite(bytes) ? bytes : 0 });
      }

      if (items.length < 100) break;
      offset += items.length;
    }
  }

  return out;
}

async function objectBytes(
  supabase: ReturnType<typeof getServiceSupabase>,
  path: string
): Promise<number | null> {
  const parent = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
  const name = path.includes('/') ? path.slice(path.lastIndexOf('/') + 1) : path;
  const { data, error } = await supabase.storage.from(BUCKET_NAME).list(parent, {
    search: name,
    limit: 100,
  });
  if (error) return null;
  const hit = data?.find((row) => row.name === name);
  if (!hit) return null;
  const bytes = Number(hit.metadata?.size ?? 0);
  return Number.isFinite(bytes) ? bytes : 0;
}

function shouldSkipRecompress(path: string, bytes: number, kind: 'setup' | 'thumbnail') {
  const isWebp = /\.webp$/i.test(path);
  const limit = kind === 'setup' ? SETUP_SKIP_BYTES : THUMB_SKIP_BYTES;
  return isWebp && bytes > 0 && bytes <= limit;
}

async function buildCandidates(supabase: ReturnType<typeof getServiceSupabase>) {
  const candidates: Candidate[] = [];
  const referenced = new Set<string>();

  const { data: metaRows, error: metaError } = await supabase
    .from('spokedu_master_program_meta')
    .select('curriculum_id, sm_setup_image_url')
    .not('sm_setup_image_url', 'is', null);

  if (metaError) throw new Error(`meta 조회 실패: ${metaError.message}`);

  for (const row of metaRows ?? []) {
    const curriculumId = Number(row.curriculum_id);
    const path = storagePathFromPublicUrl(String(row.sm_setup_image_url ?? ''));
    if (!path || !Number.isFinite(curriculumId)) continue;
    referenced.add(path);
    const bytes = (await objectBytes(supabase, path)) ?? 0;
    if (shouldSkipRecompress(path, bytes, 'setup')) {
      candidates.push({
        kind: 'setup',
        curriculumId,
        path,
        bytes,
        action: 'skip',
        reason: '이미 충분히 작음',
      });
      continue;
    }
    candidates.push({
      kind: 'setup',
      curriculumId,
      path,
      bytes,
      action: 'recompress',
    });
  }

  const { data: pack, error: packError } = await supabase
    .from('think_asset_packs')
    .select('assets_json')
    .eq('id', SPOMOVE_THUMBNAIL_PACK_ID)
    .maybeSingle();

  if (packError && packError.code !== 'PGRST116') {
    throw new Error(`썸네일 팩 조회 실패: ${packError.message}`);
  }

  const thumbs = normalizeSpomoveThumbnailMap(pack?.assets_json);
  for (const [presetId, rawPath] of Object.entries(thumbs)) {
    const path = storagePathFromPublicUrl(rawPath) || rawPath.split('?')[0];
    if (!path) continue;
    referenced.add(path);
    const bytes = (await objectBytes(supabase, path)) ?? 0;
    if (shouldSkipRecompress(path, bytes, 'thumbnail')) {
      candidates.push({
        kind: 'thumbnail',
        presetId,
        path,
        bytes,
        action: 'skip',
        reason: '이미 충분히 작음',
      });
      continue;
    }
    candidates.push({
      kind: 'thumbnail',
      presetId,
      path,
      bytes,
      action: 'recompress',
    });
  }

  const programFiles = await listAllFiles(supabase, 'spokedu-master/programs');
  for (const file of programFiles) {
    if (referenced.has(file.path)) continue;
    candidates.push({
      kind: 'orphan',
      path: file.path,
      bytes: file.bytes,
      action: 'delete-orphan',
      reason: 'DB 미참조 세팅 이미지',
    });
  }

  const thumbFiles = await listAllFiles(supabase, 'spokedu-master/spomove-thumbnails');
  for (const file of thumbFiles) {
    if (referenced.has(file.path)) continue;
    candidates.push({
      kind: 'orphan',
      path: file.path,
      bytes: file.bytes,
      action: 'delete-orphan',
      reason: '팩 미참조 썸네일',
    });
  }

  const actionable = candidates.filter((c) => c.action !== 'skip');
  const skipCount = candidates.length - actionable.length;
  const beforeBytes = actionable.reduce((sum, c) => sum + c.bytes, 0);

  return { candidates, actionable, skipCount, beforeBytes, referencedThumbs: thumbs };
}

async function recompressBuffer(input: Buffer, kind: 'setup' | 'thumbnail') {
  const max = kind === 'setup' ? SETUP_MAX : THUMB_MAX;
  const quality = kind === 'setup' ? SETUP_QUALITY : THUMB_QUALITY;
  return sharp(input)
    .rotate()
    .resize({
      width: max,
      height: max,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality })
    .toBuffer();
}

function summarize(candidates: Candidate[]) {
  const recompress = candidates.filter((c) => c.action === 'recompress');
  const orphans = candidates.filter((c) => c.action === 'delete-orphan');
  const skip = candidates.filter((c) => c.action === 'skip');
  const beforeBytes =
    recompress.reduce((s, c) => s + c.bytes, 0) + orphans.reduce((s, c) => s + c.bytes, 0);
  return {
    recompressCount: recompress.length,
    orphanCount: orphans.length,
    skipCount: skip.length,
    beforeBytes,
    beforeMb: Math.round((beforeBytes / 1024 / 1024) * 10) / 10,
    setupRecompress: recompress.filter((c) => c.kind === 'setup').length,
    thumbnailRecompress: recompress.filter((c) => c.kind === 'thumbnail').length,
  };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const supabase = getServiceSupabase();
    const { candidates, actionable } = await buildCandidates(supabase);
    return NextResponse.json({
      dryRun: true,
      summary: summarize(candidates),
      sample: actionable.slice(0, 40),
    });
  } catch (error) {
    devLogger.error('[spokedu-master/storage/recompress GET]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '미리보기에 실패했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      dryRun?: boolean;
      limit?: number;
      deleteOrphans?: boolean;
    };
    const dryRun = Boolean(body.dryRun);
    const deleteOrphans = body.deleteOrphans !== false;
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number.isFinite(Number(body.limit)) ? Math.floor(Number(body.limit)) : DEFAULT_LIMIT)
    );

    const supabase = getServiceSupabase();
    const { candidates, referencedThumbs } = await buildCandidates(supabase);
    const summaryBefore = summarize(candidates);

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        summary: summaryBefore,
        sample: candidates.filter((c) => c.action !== 'skip').slice(0, 40),
      });
    }

    const queue = candidates.filter((c) => {
      if (c.action === 'skip') return false;
      if (c.action === 'delete-orphan' && !deleteOrphans) return false;
      return true;
    });

    // 용량 큰 것부터
    queue.sort((a, b) => b.bytes - a.bytes);
    const batch = queue.slice(0, limit);
    const results: ApplyItemResult[] = [];
    let savedBytes = 0;
    let thumbMap = { ...referencedThumbs };
    let thumbDirty = false;

    for (const item of batch) {
      if (item.action === 'delete-orphan') {
        const { error } = await supabase.storage.from(BUCKET_NAME).remove([item.path]);
        if (error) {
          results.push({
            kind: item.kind,
            path: item.path,
            beforeBytes: item.bytes,
            status: 'error',
            error: error.message,
          });
          continue;
        }
        savedBytes += item.bytes;
        results.push({
          kind: item.kind,
          path: item.path,
          beforeBytes: item.bytes,
          afterBytes: 0,
          status: 'ok',
        });
        continue;
      }

      const kind = item.kind === 'thumbnail' ? 'thumbnail' : 'setup';
      const { data: blob, error: dlError } = await supabase.storage.from(BUCKET_NAME).download(item.path);
      if (dlError || !blob) {
        results.push({
          kind: item.kind,
          path: item.path,
          beforeBytes: item.bytes,
          status: 'error',
          error: dlError?.message ?? 'download 실패',
        });
        continue;
      }

      try {
        const input = Buffer.from(await blob.arrayBuffer());
        const output = await recompressBuffer(input, kind);
        if (output.byteLength >= item.bytes && /\.webp$/i.test(item.path)) {
          results.push({
            kind: item.kind,
            path: item.path,
            beforeBytes: item.bytes,
            afterBytes: item.bytes,
            status: 'skipped',
            error: '재압축해도 더 작아지지 않음',
          });
          continue;
        }

        const nextPath =
          kind === 'setup'
            ? `spokedu-master/programs/${item.curriculumId}/setup-${Date.now()}.webp`
            : `spokedu-master/spomove-thumbnails/${item.presetId}/thumbnail.webp`;

        const { error: upError } = await supabase.storage.from(BUCKET_NAME).upload(nextPath, output, {
          contentType: 'image/webp',
          upsert: true,
        });
        if (upError) {
          results.push({
            kind: item.kind,
            path: item.path,
            beforeBytes: item.bytes,
            status: 'error',
            error: upError.message,
          });
          continue;
        }

        if (kind === 'setup' && item.curriculumId != null) {
          const nextUrl = publicUrlForPath(nextPath);
          const { error: metaUpdateError } = await supabase
            .from('spokedu_master_program_meta')
            .update({ sm_setup_image_url: nextUrl })
            .eq('curriculum_id', item.curriculumId);
          if (metaUpdateError) {
            await supabase.storage.from(BUCKET_NAME).remove([nextPath]);
            results.push({
              kind: item.kind,
              path: item.path,
              beforeBytes: item.bytes,
              status: 'error',
              error: metaUpdateError.message,
            });
            continue;
          }
        } else if (kind === 'thumbnail' && item.presetId) {
          thumbMap = { ...thumbMap, [item.presetId]: nextPath };
          thumbDirty = true;
        }

        if (nextPath !== item.path) {
          await supabase.storage.from(BUCKET_NAME).remove([item.path]).catch(() => undefined);
        }

        savedBytes += Math.max(0, item.bytes - output.byteLength);
        results.push({
          kind: item.kind,
          path: item.path,
          nextPath,
          beforeBytes: item.bytes,
          afterBytes: output.byteLength,
          status: 'ok',
        });
      } catch (err) {
        results.push({
          kind: item.kind,
          path: item.path,
          beforeBytes: item.bytes,
          status: 'error',
          error: err instanceof Error ? err.message : '재압축 실패',
        });
      }
    }

    if (thumbDirty) {
      const updatedAt = new Date().toISOString();
      const { error: packSaveError } = await supabase.from('think_asset_packs').upsert(
        {
          id: SPOMOVE_THUMBNAIL_PACK_ID,
          name: SPOMOVE_THUMBNAIL_PACK_NAME,
          theme: 'spomove',
          assets_json: { thumbnails: thumbMap },
          updated_at: updatedAt,
        },
        { onConflict: 'id' }
      );
      if (packSaveError) {
        return NextResponse.json(
          {
            error: `썸네일 팩 저장 실패: ${packSaveError.message}`,
            results,
            savedBytes,
          },
          { status: 500 }
        );
      }
    }

    const okCount = results.filter((r) => r.status === 'ok').length;
    const errorCount = results.filter((r) => r.status === 'error').length;
    const remaining = Math.max(0, queue.length - batch.length);

    return NextResponse.json({
      dryRun: false,
      summary: summaryBefore,
      processed: results.length,
      okCount,
      errorCount,
      remaining,
      savedBytes,
      savedMb: Math.round((savedBytes / 1024 / 1024) * 10) / 10,
      results,
    });
  } catch (error) {
    devLogger.error('[spokedu-master/storage/recompress POST]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '재압축에 실패했습니다.' },
      { status: 500 }
    );
  }
}
