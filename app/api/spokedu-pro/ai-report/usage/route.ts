/**
 * GET /api/spokedu-pro/ai-report/usage
 * 이번 달 AI 리포트 사용량 조회 (basic 플랜 전용)
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';

const BASIC_REPORT_LIMIT = 20;

export async function GET() {
  const serverSupabase = await createServerSupabaseClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const DB_READY = process.env.SPOKEDU_PRO_DB_READY === 'true';
  if (!DB_READY) {
    return NextResponse.json({ ok: true, used: 0, limit: null, plan: 'free' });
  }

  const supabase = getServiceSupabase();

  const { data: center } = await supabase
    .from('spokedu_pro_centers')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (!center) {
    return NextResponse.json({ ok: true, used: 0, limit: null, plan: 'free' });
  }

  const { data: sub } = await supabase
    .from('spokedu_pro_subscriptions')
    .select('plan, status')
    .eq('center_id', center.id)
    .maybeSingle();

  const plan = sub?.plan ?? 'free';
  const isActive = !sub || sub.status === 'active' || sub.status === 'trialing';

  if (plan !== 'basic' || !isActive) {
    return NextResponse.json({ ok: true, used: 0, limit: plan === 'basic' ? BASIC_REPORT_LIMIT : null, plan });
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { count } = await supabase
    .from('spokedu_pro_ai_reports')
    .select('*', { count: 'exact', head: true })
    .eq('center_id', center.id)
    .gte('created_at', monthStart);

  return NextResponse.json({ ok: true, used: count ?? 0, limit: BASIC_REPORT_LIMIT, plan });
}
