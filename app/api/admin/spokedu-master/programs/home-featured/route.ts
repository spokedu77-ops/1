import { NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';

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

type CurriculumRow = {
  id: number;
  title: string | null;
  url: string | null;
  display_order: number | null;
};

type MetaRow = {
  curriculum_id: number;
  sm_tags: string[] | null;
  sm_theme: string | null;
  sm_grade: string | null;
  sm_space: string | null;
  sm_duration: number | null;
  sm_is_pro: boolean;
  sm_is_new: boolean;
  sm_is_hot: boolean;
  sm_display_order: number;
  sm_objective: string | null;
  sm_development_focus: string | null;
  sm_coach_script: string | null;
  sm_parent_note: string | null;
  sm_related_spomove_ids: string[] | null;
};

type OverlayRow = {
  source_center_curriculum_id: number | null;
  video_url: string | null;
  updated_at: string | null;
};

function scoreHomeFeatured(row: CurriculumRow, meta: MetaRow | null, videoUrl: string | undefined) {
  let score = 0;
  if (videoUrl) score += 50;
  if (meta?.sm_objective?.trim()) score += 12;
  if (meta?.sm_development_focus?.trim()) score += 8;
  if (meta?.sm_coach_script?.trim()) score += 8;
  if (meta?.sm_grade?.trim()) score += 5;
  if (meta?.sm_space?.trim()) score += 5;
  const order = meta?.sm_display_order ?? row.display_order;
  if (typeof order === 'number') score += Math.max(0, 25 - Math.min(order, 25));
  if (meta?.sm_is_hot) score += 3;
  return score;
}

async function loadHomeFeaturedCandidates(limit: number) {
  const supabase = getServiceSupabase();

  const { data: curriculumRows, error: currErr } = await supabase
    .from('curriculum')
    .select('id,title,url,display_order')
    .eq('is_sub', false);

  if (currErr || !curriculumRows) {
    throw new Error(currErr?.message ?? 'curriculum load failed');
  }

  const curriculumIds = (curriculumRows as CurriculumRow[]).map((row) => row.id);

  const metaById = new Map<number, MetaRow>();
  if (curriculumIds.length > 0) {
    const { data: metaRows } = await supabase.from('spokedu_master_program_meta').select('*').in('curriculum_id', curriculumIds);
    for (const meta of (metaRows ?? []) as MetaRow[]) {
      metaById.set(meta.curriculum_id, meta);
    }
  }

  const overlayById = new Map<number, OverlayRow>();
  if (curriculumIds.length > 0) {
    const { data: overlayRows } = await supabase
      .from('spokedu_pro_programs')
      .select('source_center_curriculum_id,video_url,updated_at')
      .in('source_center_curriculum_id', curriculumIds);

    for (const overlay of (overlayRows ?? []) as OverlayRow[]) {
      const id = overlay.source_center_curriculum_id;
      if (id == null) continue;
      const prev = overlayById.get(id);
      if (!prev) {
        overlayById.set(id, overlay);
        continue;
      }
      const prevTime = prev.updated_at ? Date.parse(prev.updated_at) : 0;
      const nextTime = overlay.updated_at ? Date.parse(overlay.updated_at) : 0;
      if (nextTime >= prevTime) overlayById.set(id, overlay);
    }
  }

  const ranked = (curriculumRows as CurriculumRow[])
    .map((row) => {
      const meta = metaById.get(row.id) ?? null;
      const overlay = overlayById.get(row.id);
      const videoUrl = normalizeVideoUrl(overlay?.video_url) ?? normalizeVideoUrl(row.url);
      return {
        curriculumId: row.id,
        title: (row.title ?? '').trim() || `커리큘럼 #${row.id}`,
        score: scoreHomeFeatured(row, meta, videoUrl),
        hasVideo: Boolean(videoUrl),
        currentHot: Boolean(meta?.sm_is_hot),
        currentOrder: meta?.sm_display_order ?? row.display_order ?? null,
        meta,
      };
    })
    .sort((a, b) => b.score - a.score || a.curriculumId - b.curriculumId);

  return ranked.slice(0, Math.max(1, Math.min(limit, 20)));
}

function buildMetaPatch(meta: MetaRow | null, curriculumId: number, index: number): MetaRow {
  return {
    curriculum_id: curriculumId,
    sm_tags: meta?.sm_tags ?? [],
    sm_theme: meta?.sm_theme ?? null,
    sm_grade: meta?.sm_grade ?? null,
    sm_space: meta?.sm_space ?? null,
    sm_duration: meta?.sm_duration ?? 20,
    sm_is_pro: meta?.sm_is_pro ?? false,
    sm_is_new: meta?.sm_is_new ?? false,
    sm_is_hot: true,
    sm_display_order: index,
    sm_objective: meta?.sm_objective ?? null,
    sm_development_focus: meta?.sm_development_focus ?? null,
    sm_coach_script: meta?.sm_coach_script ?? null,
    sm_parent_note: meta?.sm_parent_note ?? null,
    sm_related_spomove_ids: meta?.sm_related_spomove_ids ?? [],
  };
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(20, Math.max(1, Number(searchParams.get('limit') ?? 8) || 8));

  try {
    const candidates = await loadHomeFeaturedCandidates(limit);
    return NextResponse.json({ data: candidates });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'preview failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: { limit?: number; replaceHot?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const limit = Math.min(20, Math.max(1, Number(body.limit ?? 8) || 8));
  const replaceHot = body.replaceHot !== false;

  try {
    const supabase = getServiceSupabase();
    const candidates = await loadHomeFeaturedCandidates(limit);
    const selectedIds = candidates.map((item) => item.curriculumId);

    if (replaceHot) {
      const { error: clearError } = await supabase.from('spokedu_master_program_meta').update({ sm_is_hot: false }).neq('curriculum_id', 0);
      if (clearError) throw clearError;
    }

    const patches = candidates.map((item, index) => buildMetaPatch(item.meta, item.curriculumId, index));
    const { error: upsertError } = await supabase.from('spokedu_master_program_meta').upsert(patches, { onConflict: 'curriculum_id' });
    if (upsertError) throw upsertError;

    return NextResponse.json({
      ok: true,
      applied: patches.length,
      selectedIds,
      replaceHot,
      message: '홈 추천 8개가 저장되었습니다. MASTER 홈에서 새로고침해 확인하세요.',
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'apply failed' }, { status: 500 });
  }
}
