import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';

/** 버킷 전체 스캔·삭제는 수 분 걸릴 수 있음 (플랫폼 기본 제한 회피) */
export const maxDuration = 300;

const TARGET_BUCKET = 'session-photos';
const LIST_PAGE_SIZE = 1000;
const REMOVE_BATCH_SIZE = 100;
const SESSION_PAGE_SIZE = 500;
const MAX_SAMPLE = 20;

type StorageListItem = {
  name: string;
  id?: string | null;
  created_at?: string | null;
};

function toBool(value: string | null): boolean {
  if (!value) return false;
  const lower = value.toLowerCase();
  return lower === '1' || lower === 'true' || lower === 'yes';
}

function getDaysThreshold(raw: string | null): number {
  const parsed = Number(raw ?? '7');
  if (!Number.isFinite(parsed) || parsed <= 0) return 7;
  return Math.floor(parsed);
}

function chunk<T>(arr: T[], size: number): T[][] {
  if (arr.length === 0) return [];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function isFolder(item: StorageListItem): boolean {
  return !item.id;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const dryRun = toBool(request.nextUrl.searchParams.get('dryRun'));
  const days = getDaysThreshold(request.nextUrl.searchParams.get('days'));
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    const supabase = getServiceSupabase();

    // 1) session-photos 버킷 전체를 순회하여 오래된 객체 경로 수집
    const queue: string[] = [''];
    const oldPaths: string[] = [];
    const listErrors: string[] = [];

    while (queue.length > 0) {
      const prefix = queue.shift() ?? '';
      let offset = 0;

      while (true) {
        const { data, error } = await supabase.storage.from(TARGET_BUCKET).list(prefix, {
          limit: LIST_PAGE_SIZE,
          offset,
        });

        if (error) {
          listErrors.push(`${prefix || '/'}: ${error.message}`);
          break;
        }

        const items = (data ?? []) as StorageListItem[];
        for (const item of items) {
          const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
          if (isFolder(item)) {
            queue.push(fullPath);
            continue;
          }

          const createdAt = item.created_at ? new Date(item.created_at) : null;
          if (!createdAt || Number.isNaN(createdAt.getTime())) continue;
          if (createdAt < cutoffDate) oldPaths.push(fullPath);
        }

        if (items.length < LIST_PAGE_SIZE) break;
        offset += LIST_PAGE_SIZE;
      }
    }

    const uniqueOldPaths = [...new Set(oldPaths)];
    const samplePaths = uniqueOldPaths.slice(0, MAX_SAMPLE);
    const publicUrls = uniqueOldPaths.map((path) =>
      supabase.storage.from(TARGET_BUCKET).getPublicUrl(path).data.publicUrl
    );
    const targetUrlSet = new Set(publicUrls);

    // 2) dry-run 이면 여기서 종료
    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        bucket: TARGET_BUCKET,
        days,
        cutoffIso: cutoffDate.toISOString(),
        candidateFileCount: uniqueOldPaths.length,
        listErrorCount: listErrors.length,
        listErrors: listErrors.slice(0, MAX_SAMPLE),
        samplePaths,
      });
    }

    // 3) storage 객체 삭제
    let deletedCount = 0;
    const removeErrors: string[] = [];
    for (const batch of chunk(uniqueOldPaths, REMOVE_BATCH_SIZE)) {
      const { data, error } = await supabase.storage.from(TARGET_BUCKET).remove(batch);
      if (error) {
        removeErrors.push(error.message);
        continue;
      }
      deletedCount += data?.length ?? 0;
    }

    // 4) sessions.photo_url에서 삭제된 URL 정리 (행 자체는 삭제하지 않음)
    let sessionOffset = 0;
    let scannedSessionCount = 0;
    let updatedSessionCount = 0;
    const sessionErrors: string[] = [];

    while (true) {
      const { data: sessions, error } = await supabase
        .from('sessions')
        .select('id, photo_url')
        .not('photo_url', 'is', null)
        .order('id', { ascending: true })
        .range(sessionOffset, sessionOffset + SESSION_PAGE_SIZE - 1);

      if (error) {
        sessionErrors.push(error.message);
        break;
      }

      const rows = (sessions ?? []) as Array<{ id: string; photo_url: unknown }>;
      if (rows.length === 0) break;
      scannedSessionCount += rows.length;

      for (const row of rows) {
        const current = Array.isArray(row.photo_url)
          ? row.photo_url.filter((v): v is string => typeof v === 'string')
          : [];
        if (current.length === 0) continue;

        const next = current.filter((url) => !targetUrlSet.has(url));
        if (next.length === current.length) continue;

        const { error: updateErr } = await supabase
          .from('sessions')
          .update({ photo_url: next })
          .eq('id', row.id);

        if (updateErr) {
          sessionErrors.push(`${row.id}: ${updateErr.message}`);
          continue;
        }
        updatedSessionCount += 1;
      }

      if (rows.length < SESSION_PAGE_SIZE) break;
      sessionOffset += SESSION_PAGE_SIZE;
    }

    return NextResponse.json({
      ok: true,
      dryRun: false,
      bucket: TARGET_BUCKET,
      days,
      cutoffIso: cutoffDate.toISOString(),
      candidateFileCount: uniqueOldPaths.length,
      deletedFileCount: deletedCount,
      scannedSessionCount,
      updatedSessionCount,
      listErrorCount: listErrors.length,
      removeErrorCount: removeErrors.length,
      sessionErrorCount: sessionErrors.length,
      listErrors: listErrors.slice(0, MAX_SAMPLE),
      removeErrors: removeErrors.slice(0, MAX_SAMPLE),
      sessionErrors: sessionErrors.slice(0, MAX_SAMPLE),
      samplePaths,
    });
  } catch (err) {
    devLogger.error('[cleanup-session-photos]', err);
    return NextResponse.json(
      { error: '세션 사진 정리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
