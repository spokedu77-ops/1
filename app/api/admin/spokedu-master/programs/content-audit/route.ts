import { NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import {
  buildContentAuditItem,
  normalizeAuditVideoUrl,
  sortContentAuditItems,
  summarizeContentAudit,
} from '@/app/spokedu-master/lib/contentAuditReport';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function parseLimit(request: Request) {
  const url = new URL(request.url);
  const raw = Number(url.searchParams.get('limit') ?? '20');
  if (!Number.isFinite(raw)) return 20;
  return Math.min(Math.max(Math.trunc(raw), 1), 100);
}

function splitLines(value: string | null | undefined): string[] {
  return [...new Set(String(value ?? '').split('\n').map((item) => item.trim()).filter(Boolean))];
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const limit = parseLimit(request);

  try {
    const supabase = getServiceSupabase();
    const { data: curriculumRows, error: currErr } = await supabase
      .from('curriculum')
      .select('id,title,url,display_order')
      .eq('is_sub', false)
      .order('display_order', { ascending: true, nullsFirst: false })
      .limit(200);

    if (currErr) throw currErr;

    const ids = (curriculumRows ?? []).map((row) => row.id as number);
    const metaById = new Map<
      number,
      {
        sm_is_hot: boolean;
        sm_display_order: number;
        sm_tags: string[] | null;
        sm_briefing_notes: string | null;
      }
    >();
    if (ids.length > 0) {
      const { data: metaRows } = await supabase
        .from('spokedu_master_program_meta')
        .select('curriculum_id,sm_is_hot,sm_display_order,sm_tags,sm_briefing_notes')
        .in('curriculum_id', ids);
      for (const meta of metaRows ?? []) {
        metaById.set(meta.curriculum_id as number, {
          sm_is_hot: Boolean(meta.sm_is_hot),
          sm_display_order: Number(meta.sm_display_order ?? 9999),
          sm_tags: Array.isArray(meta.sm_tags) ? (meta.sm_tags as string[]) : null,
          sm_briefing_notes: (meta.sm_briefing_notes as string | null) ?? null,
        });
      }
    }

    const overlayById = new Map<
      number,
      { video_url: string | null; equipment: string | null; activity_method: string | null }
    >();
    if (ids.length > 0) {
      const { data: overlayRows } = await supabase
        .from('spokedu_pro_programs')
        .select('source_center_curriculum_id,video_url,equipment,activity_method')
        .in('source_center_curriculum_id', ids);
      for (const row of overlayRows ?? []) {
        const id = row.source_center_curriculum_id as number | null;
        if (id == null) continue;
        overlayById.set(id, {
          video_url: (row.video_url as string | null) ?? null,
          equipment: (row.equipment as string | null) ?? null,
          activity_method: (row.activity_method as string | null) ?? null,
        });
      }
    }

    const audited = sortContentAuditItems(
      (curriculumRows ?? []).map((row) => {
        const id = row.id as number;
        const meta = metaById.get(id);
        const overlay = overlayById.get(id);
        const videoUrl =
          normalizeAuditVideoUrl(overlay?.video_url) ?? normalizeAuditVideoUrl(row.url as string | null);
        return buildContentAuditItem({
          curriculumId: id,
          title: (row.title as string | null)?.trim() || `커리큘럼 #${id}`,
          videoUrl,
          equipment: splitLines(overlay?.equipment),
          steps: splitLines(overlay?.activity_method),
          tags: meta?.sm_tags ?? [],
          briefingNotes: meta?.sm_briefing_notes ?? null,
          isHot: Boolean(meta?.sm_is_hot),
          displayOrder: meta?.sm_display_order ?? (row.display_order as number | null),
        });
      }),
    ).slice(0, limit);

    return NextResponse.json({
      data: audited,
      summary: summarizeContentAudit(audited),
      meta: {
        limit,
        source: 'HOT 우선 → display_order → curriculum id',
        checklistColumns: ['영상', '준비물', '안전', '단계', '태그'],
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'load failed' },
      { status: 500 },
    );
  }
}
