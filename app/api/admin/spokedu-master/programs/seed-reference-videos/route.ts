import { NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { resolveReferenceVideoForSeed } from '@/app/spokedu-master/lib/reference-videos';

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

    const candidates: { id: number; title: string; url: string }[] = [];

    for (const row of curriculumRows ?? []) {
      const id = row.id as number;
      const meta = metaById.get(id);
      if (hotOnly && !meta?.sm_is_hot) continue;

      const existing = normalizeVideoUrl(row.url as string | null);
      if (existing) continue;

      const title = ((row.title as string | null) ?? '').trim() || `커리큘럼 #${id}`;
      const resolved = resolveReferenceVideoForSeed(title, id);
      if (!resolved) continue;

      candidates.push({ id, title, url: resolved });
    }

    if (!dryRun) {
      for (const item of candidates) {
        const { error } = await supabase.from('curriculum').update({ url: item.url }).eq('id', item.id);
        if (error) throw error;
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
          ? `${dryRun ? '적용 예정' : '저장 완료'} ${candidates.length}개 curriculum.url — MASTER 홈을 새로고침하세요.`
          : '채울 수 있는 참고 영상 규칙이 없습니다. curriculum에 URL을 직접 입력하세요.',
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'seed failed' }, { status: 500 });
  }
}
