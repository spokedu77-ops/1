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

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

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
    const metaById = new Map<number, { sm_is_hot: boolean; sm_display_order: number }>();
    if (ids.length > 0) {
      const { data: metaRows } = await supabase
        .from('spokedu_master_program_meta')
        .select('curriculum_id,sm_is_hot,sm_display_order')
        .in('curriculum_id', ids);
      for (const meta of metaRows ?? []) {
        metaById.set(meta.curriculum_id as number, {
          sm_is_hot: Boolean(meta.sm_is_hot),
          sm_display_order: Number(meta.sm_display_order ?? 9999),
        });
      }
    }

    const overlayById = new Map<number, string | null>();
    if (ids.length > 0) {
      const { data: overlayRows } = await supabase
        .from('spokedu_pro_programs')
        .select('source_center_curriculum_id,video_url,updated_at')
        .in('source_center_curriculum_id', ids);
      for (const row of overlayRows ?? []) {
        const id = row.source_center_curriculum_id as number | null;
        if (id == null) continue;
        overlayById.set(id, row.video_url as string | null);
      }
    }

    const gaps = (curriculumRows ?? [])
      .map((row) => {
        const id = row.id as number;
        const meta = metaById.get(id);
        const videoUrl = normalizeVideoUrl(overlayById.get(id)) ?? normalizeVideoUrl(row.url as string | null);
        return {
          curriculumId: id,
          title: (row.title as string | null)?.trim() || `커리큘럼 #${id}`,
          hasVideo: Boolean(videoUrl),
          isHot: Boolean(meta?.sm_is_hot),
          displayOrder: meta?.sm_display_order ?? (row.display_order as number | null),
          curriculumUrl: (row.url as string | null) ?? '',
        };
      })
      .filter((row) => !row.hasVideo)
      .sort((a, b) => {
        if (a.isHot !== b.isHot) return Number(b.isHot) - Number(a.isHot);
        const orderA = typeof a.displayOrder === 'number' ? a.displayOrder : 9999;
        const orderB = typeof b.displayOrder === 'number' ? b.displayOrder : 9999;
        return orderA - orderB;
      });

    const hotGaps = gaps.filter((row) => row.isHot);

    return NextResponse.json({
      data: gaps.slice(0, 40),
      summary: {
        totalGaps: gaps.length,
        hotGaps: hotGaps.length,
        message:
          hotGaps.length > 0
            ? `HOT ${hotGaps.length}개에 참고 영상이 없어 홈 카드가 단조로울 수 있습니다. curriculum URL 또는 SPOMOVE overlay 영상을 채우세요.`
            : 'HOT 수업은 모두 참고 영상이 있습니다.',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'load failed' }, { status: 500 });
  }
}
