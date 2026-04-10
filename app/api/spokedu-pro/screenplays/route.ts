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

export async function GET() {
  const serverSupabase = await createServerSupabaseClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('spokedu_pro_screenplays')
      .select('id, mode_id, title, subtitle, description, sort_order, preset_ref, thumbnail_url')
      .eq('is_published', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    // DB 컬럼 → camelCase 변환
    const screenplays = (data ?? []).map((row) => ({
      id: row.id,
      modeId: row.mode_id,
      title: row.title,
      subtitle: row.subtitle ?? undefined,
      description: row.description ?? undefined,
      sortOrder: row.sort_order,
      presetRef: row.preset_ref ?? undefined,
      thumbnailUrl: row.thumbnail_url ?? undefined,
    }));

    return NextResponse.json({ ok: true, screenplays, source: 'db' });
  } catch {
    // DB 실패 시에도 잘못된 하드코딩 노출을 막기 위해 빈 목록 반환
    return NextResponse.json({
      ok: true,
      screenplays: [],
      source: 'empty_db_error',
    });
  }
}
