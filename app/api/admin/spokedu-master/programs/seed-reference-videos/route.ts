import { NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { resolveReferenceVideoForSeed } from '@/app/spokedu-master/lib/reference-videos';
import { buildMissingMasterMetaRows } from '../sync-center/metaRowContract';

const INVALID_VIDEO = new Set(['', '-', '0', '123', 'none', 'null', 'undefined', '없음', '영상없음']);

function normalizeVideoUrl(value: string | null | undefined): string | undefined {
  const text = (value ?? '').trim();
  if (!text || INVALID_VIDEO.has(text.toLowerCase().replace(/\s+/g, ''))) return undefined;
  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:' ? text : undefined;
  } catch {
    return undefined;
  }
}

type OverlayVideoRow = {
  id: number;
  source_center_curriculum_id: number | null;
  video_url: string | null;
  updated_at: string | null;
};

function latestOverlayByCurriculumId(rows: OverlayVideoRow[]) {
  const map = new Map<number, OverlayVideoRow>();
  for (const row of rows) {
    const curriculumId = row.source_center_curriculum_id;
    if (curriculumId == null) continue;
    const prev = map.get(curriculumId);
    if (!prev) {
      map.set(curriculumId, row);
      continue;
    }
    const prevTime = prev.updated_at ? Date.parse(prev.updated_at) : 0;
    const nextTime = row.updated_at ? Date.parse(row.updated_at) : 0;
    if (nextTime >= prevTime) map.set(curriculumId, row);
  }
  return map;
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: { hotOnly?: boolean; dryRun?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const hotOnly = body.hotOnly !== false;
  const dryRun = body.dryRun === true;

  try {
    const supabase = getServiceSupabase();
    const { data: curriculumRows, error: currErr } = await supabase
      .from('curriculum')
      .select('id,title,url')
      .eq('is_sub', false);

    if (currErr) throw currErr;

    const ids = (curriculumRows ?? []).map((row) => row.id as number);
    const metaById = new Map<number, { sm_is_hot: boolean }>();
    if (ids.length > 0) {
      const { data: metaRows } = await supabase
        .from('spokedu_master_program_meta')
        .select('curriculum_id,sm_is_hot')
        .in('curriculum_id', ids);
      for (const meta of metaRows ?? []) {
        metaById.set(meta.curriculum_id as number, { sm_is_hot: Boolean(meta.sm_is_hot) });
      }
    }

    let overlayById = new Map<number, OverlayVideoRow>();
    if (ids.length > 0) {
      const { data: overlayRows, error: overlayErr } = await supabase
        .from('spokedu_pro_programs')
        .select('id,source_center_curriculum_id,video_url,updated_at')
        .in('source_center_curriculum_id', ids);
      if (overlayErr) throw overlayErr;
      overlayById = latestOverlayByCurriculumId((overlayRows ?? []) as OverlayVideoRow[]);
    }

    const candidates: { id: number; title: string; url: string }[] = [];

    for (const row of curriculumRows ?? []) {
      const id = row.id as number;
      const meta = metaById.get(id);
      if (hotOnly && !meta?.sm_is_hot) continue;

      const existing = normalizeVideoUrl(overlayById.get(id)?.video_url) ?? normalizeVideoUrl(row.url as string | null);
      if (existing) continue;

      const title = ((row.title as string | null) ?? '').trim() || `curriculum #${id}`;
      const resolved = resolveReferenceVideoForSeed(title, id);
      if (!resolved) continue;

      candidates.push({ id, title, url: resolved });
    }

    if (!dryRun) {
      for (const item of candidates) {
        const existing = overlayById.get(item.id);
        if (existing?.id) {
          const { error } = await supabase
            .from('spokedu_pro_programs')
            .update({ title: item.title, video_url: item.url, source_center_curriculum_id: item.id, is_published: true })
            .eq('id', existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('spokedu_pro_programs')
            .insert({ title: item.title, video_url: item.url, source_center_curriculum_id: item.id, is_published: true, center_curriculum_is_sub: false });
          if (error) throw error;
        }
      }

      const insertedChanges = candidates
        .filter((item) => !overlayById.has(item.id))
        .map((item) => ({ curriculumId: item.id, action: 'insert' as const }));
      if (insertedChanges.length > 0) {
        const insertedCurriculumIds = insertedChanges.map((item) => item.curriculumId);
        const { data: existingMetaRows, error: metaReadError } = await supabase
          .from('spokedu_master_program_meta')
          .select('curriculum_id')
          .in('curriculum_id', insertedCurriculumIds);
        if (metaReadError) throw metaReadError;

        const metaRows = buildMissingMasterMetaRows(
          insertedChanges,
          (existingMetaRows ?? []).map((row) => row.curriculum_id as number),
        );
        if (metaRows.length > 0) {
          const { error: metaInsertError } = await supabase
            .from('spokedu_master_program_meta')
            .upsert(metaRows, {
              onConflict: 'curriculum_id',
              ignoreDuplicates: true,
            });
          if (metaInsertError) throw metaInsertError;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      dryRun,
      hotOnly,
      applied: candidates.length,
      items: candidates,
      message:
        candidates.length > 0
          ? `${dryRun ? '적용 예정' : '저장 완료'} ${candidates.length}개 참고 영상이 MASTER overlay에 반영됩니다.`
          : '채울 수 있는 참고 영상 규칙이 없습니다. MASTER 편집기에서 영상 URL을 입력하세요.',
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'seed failed' }, { status: 500 });
  }
}
