/**
 * v4 대시보드 큐레이션. GET: activeCenter(또는 owner) 기준 dashboard_v4 published_value 반환.
 * 없으면 기본값 fallback.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { DEFAULT_DASHBOARD_V4 } from '@/app/lib/spokedu-pro/dashboardDefaults';

async function getUserId(request: NextRequest): Promise<string | null> {
  const serverSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  return user?.id ?? null;
}

/** GET: 로그인 사용자 테넌트 dashboard_v4(published_value). 없으면 기본값 */
export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getServiceSupabase();
  const { data: row, error } = await supabase
    .from('spokedu_pro_tenant_content')
    .select('published_value')
    .eq('owner_id', userId)
    .eq('key', 'dashboard_v4')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const value = row?.published_value ?? null;
  const data =
    value && typeof value === 'object' && !Array.isArray(value) && 'weekTheme' in value && 'row2' in value
      ? (value as typeof DEFAULT_DASHBOARD_V4)
      : DEFAULT_DASHBOARD_V4;

  return NextResponse.json({ data });
}
