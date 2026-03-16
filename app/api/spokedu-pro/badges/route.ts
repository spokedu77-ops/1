/**
 * GET /api/spokedu-pro/badges
 * 현재 사용자의 성취 뱃지 목록 조회 (최신 30개).
 * 저장소: spokedu_pro_tenant_content (key='badges')
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';

const BADGES_KEY = 'badges';
const LIMIT = 30;

export type Badge = {
  id: string;
  studentName: string;
  classGroup: string;
  strengthSummary: string;
  growthTag: string;
  period: string;
  generatedAt: string;
};

export async function GET() {
  const serverSupabase = await createServerSupabaseClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from('spokedu_pro_tenant_content')
    .select('draft_value')
    .eq('owner_id', user.id)
    .eq('key', BADGES_KEY)
    .maybeSingle();

  const badges = ((data?.draft_value as { badges?: Badge[] })?.badges ?? []).slice(0, LIMIT);

  return NextResponse.json({ ok: true, badges });
}
