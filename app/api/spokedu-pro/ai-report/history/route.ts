/**
 * GET /api/spokedu-pro/ai-report/history
 * 현재 센터의 AI 리포트 이력 조회 (최신순, 최대 50건).
 *
 * DB_READY=false 시 빈 배열 반환.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { resolveCenter } from '@/app/lib/server/spokeduProUtils';

const DB_READY = process.env.SPOKEDU_PRO_DB_READY === 'true';

export async function GET(req: NextRequest) {
  const serverSupabase = await createServerSupabaseClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!DB_READY) {
    return NextResponse.json({ reports: [] });
  }

  const svc = getServiceSupabase();
  const centerId = await resolveCenter(req, svc, user.id);
  if (!centerId) {
    return NextResponse.json({ reports: [] });
  }

  const { data, error } = await svc
    .from('spokedu_pro_ai_reports')
    .select(`
      id,
      goal,
      report_json,
      created_at,
      spokedu_pro_students ( id, name, class_group )
    `)
    .eq('center_id', centerId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[ai-report/history]', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  return NextResponse.json({ reports: data ?? [] });
}
