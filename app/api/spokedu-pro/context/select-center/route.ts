/**
 * 스포키듀 구독 v2: activeCenter 전환.
 * D1: 쿠키 설정 시 path='/' 적용(getActiveCenterCookieOptions).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import {
  getActiveCenterCookieOptions,
  getCenterMemberRole,
  SPOKEDU_ACTIVE_CENTER_COOKIE,
  type SupabaseClientForMemberRole,
} from '@/app/lib/server/spokeduProContext';

export async function POST(request: NextRequest) {
  const serverSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { centerId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const centerId = body.centerId;
  if (!centerId || typeof centerId !== 'string') {
    return NextResponse.json({ error: 'centerId required' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const role = await getCenterMemberRole(supabase as unknown as SupabaseClientForMemberRole, centerId, user.id);
  if (!role) {
    return NextResponse.json({ error: 'Forbidden: not a member of this center' }, { status: 403 });
  }

  const res = NextResponse.json({ ok: true, activeCenterId: centerId });
  const opts = getActiveCenterCookieOptions();
  res.cookies.set(SPOKEDU_ACTIVE_CENTER_COOKIE, centerId, opts);
  return res;
}
