/**
 * iiwarmup-files: 공지 / 주간베스트 / 노트·커리큘럼 / 레거시 폴더 정리
 * - 참조 이미지 재압축(WebP) + DB URL 교체
 * - DB 미참조 고아 삭제
 * - play_assets / flow_backgrounds 는 레거시로 전부 삭제 후보
 *
 * GET  : dry-run
 * POST : { dryRun?, limit?, deleteOrphans?, scopes? }
 *   scopes: 'notices' | 'weekly_best' | 'note-assets' | 'curriculum' | 'legacy'
 */
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { BUCKET_NAME } from '@/app/lib/admin/constants/storage';
import { devLogger } from '@/app/lib/logging/devLogger';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MEDIA_MAX = 1600;
const MEDIA_QUALITY = 85;
const SKIP_BYTES = 300_000;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 80;

const ALL_SCOPES = ['notices', 'weekly_best', 'note-assets', 'curriculum', 'legacy'] as const;
type Scope = (typeof ALL_SCOPES)[number];

type Kind =
  | 'notice'
  | 'weekly_best'
  | 'note'
  | 'curriculum'
  | 'orphan'
  | 'legacy';

type Candidate = {
  kind: Kind;
  scope: Scope;
  path: string;
  bytes: number;
  action: 'recompress' | 'delete-orphan' | 'skip';
  reason?: string;
  noticeId?: number;
  weeklyBestId?: number;
  noteBlockId?: string;
  equipmentId?: number;
  oldUrl?: string;
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

function extractIiwarmupPathsFromText(text: string): string[] {
  if (!text) return [];
  const out = new Set<string>();
  const re = new RegExp(`/storage/v1/object/public/${BUCKET_NAME}/([^"'\\s?]+)`, 'gi');
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) != null) {
    try {
      out.add(decodeURIComponent(match[1]));
    } catch {
      out.add(match[1]);
    }
  }
  return [...out];
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

function shouldSkip(path: string, bytes: number) {
  return /\.webp$/i.test(path) && bytes > 0 && bytes <= SKIP_BYTES;
}

function parseScopes(raw: unknown): Scope[] {
  if (!Array.isArray(raw) || raw.length === 0) return [...ALL_SCOPES];
  const set = new Set<Scope>();
  for (const value of raw) {
    if (typeof value === 'string' && (ALL_SCOPES as readonly string[]).includes(value)) {
      set.add(value as Scope);
    }
  }
  return set.size > 0 ? [...set] : [...ALL_SCOPES];
}

async function buildCandidates(
  supabase: ReturnType<typeof getServiceSupabase>,
  scopes: Scope[]
) {
  const candidates: Candidate[] = [];
  const scopeSet = new Set(scopes);

  // ── notices ──
  if (scopeSet.has('notices')) {
    const referenced = new Set<string>();
    const { data: rows, error } = await supabase
      .from('notices')
      .select('id, content, image_urls');
    if (error) throw new Error(`notices 조회 실패: ${error.message}`);

    for (const row of rows ?? []) {
      const noticeId = Number(row.id);
      const urls = new Set<string>();
      for (const u of Array.isArray(row.image_urls) ? row.image_urls : []) {
        if (typeof u === 'string' && u.trim()) urls.add(u.trim());
      }
      for (const path of extractIiwarmupPathsFromText(String(row.content ?? ''))) {
        if (path.startsWith('notices/')) urls.add(publicUrlForPath(path));
      }

      for (const url of urls) {
        const path = storagePathFromPublicUrl(url);
        if (!path.startsWith('notices/')) continue;
        referenced.add(path);
        const bytes = (await objectBytes(supabase, path)) ?? 0;
        if (shouldSkip(path, bytes)) {
          candidates.push({
            kind: 'notice',
            scope: 'notices',
            path,
            bytes,
            action: 'skip',
            reason: '이미 충분히 작음',
            noticeId,
            oldUrl: url,
          });
          continue;
        }
        candidates.push({
          kind: 'notice',
          scope: 'notices',
          path,
          bytes,
          action: 'recompress',
          noticeId,
          oldUrl: url,
        });
      }
    }

    for (const file of await listAllFiles(supabase, 'notices')) {
      if (referenced.has(file.path)) continue;
      candidates.push({
        kind: 'orphan',
        scope: 'notices',
        path: file.path,
        bytes: file.bytes,
        action: 'delete-orphan',
        reason: '공지 미참조',
      });
    }
  }

  // ── weekly_best ──
  if (scopeSet.has('weekly_best')) {
    const referenced = new Set<string>();
    const { data: rows, error } = await supabase.from('weekly_best').select('id, photo_urls');
    if (error) throw new Error(`weekly_best 조회 실패: ${error.message}`);

    for (const row of rows ?? []) {
      const weeklyBestId = Number(row.id);
      for (const url of Array.isArray(row.photo_urls) ? row.photo_urls : []) {
        if (typeof url !== 'string' || !url.trim()) continue;
        const path = storagePathFromPublicUrl(url);
        if (!path.startsWith('weekly_best/')) continue;
        referenced.add(path);
        const bytes = (await objectBytes(supabase, path)) ?? 0;
        if (shouldSkip(path, bytes)) {
          candidates.push({
            kind: 'weekly_best',
            scope: 'weekly_best',
            path,
            bytes,
            action: 'skip',
            reason: '이미 충분히 작음',
            weeklyBestId,
            oldUrl: url.trim(),
          });
          continue;
        }
        candidates.push({
          kind: 'weekly_best',
          scope: 'weekly_best',
          path,
          bytes,
          action: 'recompress',
          weeklyBestId,
          oldUrl: url.trim(),
        });
      }
    }

    for (const file of await listAllFiles(supabase, 'weekly_best')) {
      if (referenced.has(file.path)) continue;
      candidates.push({
        kind: 'orphan',
        scope: 'weekly_best',
        path: file.path,
        bytes: file.bytes,
        action: 'delete-orphan',
        reason: '주간베스트 미참조',
      });
    }
  }

  // ── note-assets (orphan only — 블록 JSON 재압축은 위험해서 고아 삭제만) ──
  if (scopeSet.has('note-assets')) {
    const referenced = new Set<string>();
    const { data: rows, error } = await supabase
      .from('note_blocks')
      .select('id, content')
      .limit(5000);
    if (error) throw new Error(`note_blocks 조회 실패: ${error.message}`);

    for (const row of rows ?? []) {
      const content = row.content;
      if (content && typeof content === 'object' && !Array.isArray(content)) {
        const url = (content as { url?: unknown }).url;
        if (typeof url === 'string') {
          const path = storagePathFromPublicUrl(url);
          if (path.startsWith('note-assets/')) referenced.add(path);
        }
      }
      for (const path of extractIiwarmupPathsFromText(JSON.stringify(content ?? ''))) {
        if (path.startsWith('note-assets/')) referenced.add(path);
      }
    }

    for (const file of await listAllFiles(supabase, 'note-assets')) {
      if (referenced.has(file.path)) continue;
      candidates.push({
        kind: 'orphan',
        scope: 'note-assets',
        path: file.path,
        bytes: file.bytes,
        action: 'delete-orphan',
        reason: '노트 미참조',
      });
    }
  }

  // ── curriculum ──
  if (scopeSet.has('curriculum')) {
    const referenced = new Set<string>();
    const { data: rows, error } = await supabase
      .from('center_equipment')
      .select('id, image_url')
      .not('image_url', 'is', null);
    if (error) throw new Error(`center_equipment 조회 실패: ${error.message}`);

    for (const row of rows ?? []) {
      const equipmentId = Number(row.id);
      const url = String(row.image_url ?? '').trim();
      const path = storagePathFromPublicUrl(url);
      if (!path.startsWith('curriculum/')) continue;
      referenced.add(path);
      const bytes = (await objectBytes(supabase, path)) ?? 0;
      if (shouldSkip(path, bytes)) {
        candidates.push({
          kind: 'curriculum',
          scope: 'curriculum',
          path,
          bytes,
          action: 'skip',
          reason: '이미 충분히 작음',
          equipmentId,
          oldUrl: url,
        });
        continue;
      }
      candidates.push({
        kind: 'curriculum',
        scope: 'curriculum',
        path,
        bytes,
        action: 'recompress',
        equipmentId,
        oldUrl: url,
      });
    }

    for (const file of await listAllFiles(supabase, 'curriculum')) {
      if (referenced.has(file.path)) continue;
      candidates.push({
        kind: 'orphan',
        scope: 'curriculum',
        path: file.path,
        bytes: file.bytes,
        action: 'delete-orphan',
        reason: '커리큘럼 미참조',
      });
    }
  }

  // ── legacy folders (전부 삭제 후보) ──
  if (scopeSet.has('legacy')) {
    for (const prefix of ['play_assets', 'flow_backgrounds'] as const) {
      for (const file of await listAllFiles(supabase, prefix)) {
        candidates.push({
          kind: 'legacy',
          scope: 'legacy',
          path: file.path,
          bytes: file.bytes,
          action: 'delete-orphan',
          reason: `${prefix} 레거시`,
        });
      }
    }
  }

  return candidates;
}

async function recompressBuffer(input: Buffer) {
  return sharp(input)
    .rotate()
    .resize({
      width: MEDIA_MAX,
      height: MEDIA_MAX,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: MEDIA_QUALITY })
    .toBuffer();
}

function summarize(candidates: Candidate[]) {
  const recompress = candidates.filter((c) => c.action === 'recompress');
  const orphans = candidates.filter((c) => c.action === 'delete-orphan');
  const skip = candidates.filter((c) => c.action === 'skip');
  const beforeBytes =
    recompress.reduce((s, c) => s + c.bytes, 0) + orphans.reduce((s, c) => s + c.bytes, 0);

  const byScope: Record<string, { recompress: number; orphan: number; bytes: number }> = {};
  for (const scope of ALL_SCOPES) {
    const rows = candidates.filter((c) => c.scope === scope && c.action !== 'skip');
    byScope[scope] = {
      recompress: rows.filter((c) => c.action === 'recompress').length,
      orphan: rows.filter((c) => c.action === 'delete-orphan').length,
      bytes: rows.reduce((s, c) => s + c.bytes, 0),
    };
  }

  return {
    recompressCount: recompress.length,
    orphanCount: orphans.length,
    skipCount: skip.length,
    beforeBytes,
    beforeMb: Math.round((beforeBytes / 1024 / 1024) * 10) / 10,
    byScope,
  };
}

function replaceUrlEverywhere(haystack: string, oldUrl: string, nextUrl: string) {
  if (!haystack || !oldUrl) return haystack;
  const bareOld = oldUrl.split('?')[0];
  let next = haystack.split(oldUrl).join(nextUrl);
  if (bareOld && bareOld !== oldUrl) next = next.split(bareOld).join(nextUrl);
  return next;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const scopes = parseScopes(request.nextUrl.searchParams.getAll('scope'));
    const supabase = getServiceSupabase();
    const candidates = await buildCandidates(supabase, scopes);
    const actionable = candidates.filter((c) => c.action !== 'skip');
    return NextResponse.json({
      dryRun: true,
      scopes,
      summary: summarize(candidates),
      sample: actionable.slice(0, 40),
    });
  } catch (error) {
    devLogger.error('[storage/cleanup-iiwarmup GET]', error);
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
      scopes?: string[];
    };
    const dryRun = Boolean(body.dryRun);
    const deleteOrphans = body.deleteOrphans !== false;
    const scopes = parseScopes(body.scopes);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number.isFinite(Number(body.limit)) ? Math.floor(Number(body.limit)) : DEFAULT_LIMIT)
    );

    const supabase = getServiceSupabase();
    const candidates = await buildCandidates(supabase, scopes);
    const summaryBefore = summarize(candidates);

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        scopes,
        summary: summaryBefore,
        sample: candidates.filter((c) => c.action !== 'skip').slice(0, 40),
      });
    }

    const queue = candidates.filter((c) => {
      if (c.action === 'skip') return false;
      if (c.action === 'delete-orphan' && !deleteOrphans) return false;
      return true;
    });
    queue.sort((a, b) => b.bytes - a.bytes);
    const batch = queue.slice(0, limit);
    const results: ApplyItemResult[] = [];
    let savedBytes = 0;

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
        const output = await recompressBuffer(input);
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

        const stamp = Date.now();
        const nextPath =
          item.kind === 'notice'
            ? `notices/${stamp}_${Math.random().toString(36).slice(2, 8)}.webp`
            : item.kind === 'weekly_best'
              ? `weekly_best/${stamp}_${Math.random().toString(36).slice(2, 8)}.webp`
              : item.kind === 'curriculum'
                ? `curriculum/center-equipment/recompressed-${stamp}.webp`
                : item.path.replace(/\.[^.]+$/, '.webp');

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

        const nextUrl = publicUrlForPath(nextPath);
        let dbError: string | null = null;

        if (item.kind === 'notice' && item.noticeId != null && item.oldUrl) {
          const { data: row, error } = await supabase
            .from('notices')
            .select('content, image_urls')
            .eq('id', item.noticeId)
            .maybeSingle();
          if (error) dbError = error.message;
          else if (row) {
            const imageUrls = Array.isArray(row.image_urls)
              ? row.image_urls.map((u: string) =>
                  storagePathFromPublicUrl(u) === item.path || u === item.oldUrl ? nextUrl : u
                )
              : row.image_urls;
            const content = replaceUrlEverywhere(String(row.content ?? ''), item.oldUrl, nextUrl);
            const { error: upd } = await supabase
              .from('notices')
              .update({ content, image_urls: imageUrls })
              .eq('id', item.noticeId);
            if (upd) dbError = upd.message;
          }
        } else if (item.kind === 'weekly_best' && item.weeklyBestId != null && item.oldUrl) {
          const { data: row, error } = await supabase
            .from('weekly_best')
            .select('photo_urls')
            .eq('id', item.weeklyBestId)
            .maybeSingle();
          if (error) dbError = error.message;
          else if (row) {
            const photoUrls = (Array.isArray(row.photo_urls) ? row.photo_urls : []).map((u: string) =>
              storagePathFromPublicUrl(u) === item.path || u === item.oldUrl ? nextUrl : u
            );
            const { error: upd } = await supabase
              .from('weekly_best')
              .update({ photo_urls: photoUrls })
              .eq('id', item.weeklyBestId);
            if (upd) dbError = upd.message;
          }
        } else if (item.kind === 'curriculum' && item.equipmentId != null) {
          const { error: upd } = await supabase
            .from('center_equipment')
            .update({ image_url: nextUrl })
            .eq('id', item.equipmentId);
          if (upd) dbError = upd.message;
        } else {
          dbError = '알 수 없는 재압축 대상';
        }

        if (dbError) {
          await supabase.storage.from(BUCKET_NAME).remove([nextPath]);
          results.push({
            kind: item.kind,
            path: item.path,
            beforeBytes: item.bytes,
            status: 'error',
            error: dbError,
          });
          continue;
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

    return NextResponse.json({
      dryRun: false,
      scopes,
      summary: summaryBefore,
      processed: results.length,
      okCount: results.filter((r) => r.status === 'ok').length,
      errorCount: results.filter((r) => r.status === 'error').length,
      remaining: Math.max(0, queue.length - batch.length),
      savedBytes,
      savedMb: Math.round((savedBytes / 1024 / 1024) * 10) / 10,
      results,
    });
  } catch (error) {
    devLogger.error('[storage/cleanup-iiwarmup POST]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '정리에 실패했습니다.' },
      { status: 500 }
    );
  }
}
