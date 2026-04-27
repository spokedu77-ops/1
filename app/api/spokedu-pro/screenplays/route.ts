/**
 * /api/spokedu-pro/screenplays
 * GET — 스크린플레이 목록 (DB 준비 전엔 hardcoded catalog fallback)
 *
 * DB_READY = SPOKEDU_PRO_SCREENPLAYS_DB_READY=true 시 실제 DB 조회.
 * 미설정 시 screenplayCatalog.ts hardcoded 목록 반환.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';

function mapScreenplayRows(
  rows: Array<{
    id: number;
    mode_id: string;
    title: string;
    subtitle: string | null;
    description: string | null;
    sort_order: number;
    preset_ref: string | null;
    thumbnail_url: string | null;
  }>
) {
  return rows.map((row) => ({
    id: row.id,
    modeId: row.mode_id,
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    description: row.description ?? undefined,
    sortOrder: row.sort_order,
    presetRef: row.preset_ref ?? undefined,
    thumbnailUrl: row.thumbnail_url ?? undefined,
  }));
}

export async function GET() {
  const serverSupabase = await createServerSupabaseClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const columns = 'id, mode_id, title, subtitle, description, sort_order, preset_ref, thumbnail_url';

  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('spokedu_pro_screenplays')
      .select(columns)
      .eq('is_published', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return NextResponse.json({
      ok: true,
      screenplays: mapScreenplayRows((data ?? []) as Parameters<typeof mapScreenplayRows>[0]),
      source: 'db_service',
    });
  } catch {
    // 서비스 롤 미설정/일시 오류 시: 로그인 사용자 세션으로 동일 SELECT (RLS: 공개 행만)
    try {
      const { data, error } = await serverSupabase
        .from('spokedu_pro_screenplays')
        .select(columns)
        .eq('is_published', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return NextResponse.json({
        ok: true,
        screenplays: mapScreenplayRows((data ?? []) as Parameters<typeof mapScreenplayRows>[0]),
        source: 'db_user_session',
      });
    } catch {
      return NextResponse.json({
        ok: true,
        screenplays: [],
        source: 'empty_db_error',
      });
    }
  }
}
