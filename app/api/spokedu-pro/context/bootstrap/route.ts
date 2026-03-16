/**
 * POST /api/spokedu-pro/context/bootstrap
 * 최초 접속 시 센터 + 14일 Trial 구독 자동 생성.
 * 이미 센터가 있으면 기존 센터 반환 (idempotent).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';

export async function POST(req: NextRequest) {
  const serverSupabase = await createServerSupabaseClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const supabase = getServiceSupabase();

    // 1. 기존 센터 확인
    const { data: existing } = await supabase
      .from('spokedu_pro_centers')
      .select('id, name')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (existing) {
      // 구독도 확인 후 없으면 생성
      const { data: sub } = await supabase
        .from('spokedu_pro_subscriptions')
        .select('id')
        .eq('center_id', existing.id)
        .maybeSingle();

      if (!sub) {
        const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
        await supabase.from('spokedu_pro_subscriptions').insert({
          center_id: existing.id,
          plan: 'basic',
          status: 'trialing',
          trial_end: trialEnd,
          max_classes: 3,
        });
      }

      return NextResponse.json({ ok: true, bootstrapped: false, centerId: existing.id, centerName: existing.name });
    }

    // 2. 센터명: 요청 body에서 받거나 기본값
    let centerName = '내 센터';
    try {
      const body = await req.json();
      if (body?.centerName?.trim()) centerName = body.centerName.trim();
    } catch { /* ignore */ }

    // 3. 센터 생성
    const { data: center, error: centerErr } = await supabase
      .from('spokedu_pro_centers')
      .insert({ owner_id: user.id, name: centerName })
      .select('id, name')
      .single();

    if (centerErr || !center) {
      return NextResponse.json({ error: 'center_create_failed', detail: centerErr?.message }, { status: 500 });
    }

    // 4. owner를 member 테이블에도 등록
    await supabase.from('spokedu_pro_center_members').insert({
      center_id: center.id,
      user_id: user.id,
      role: 'owner',
    });

    // 5. 14일 Trial (Basic 기능 동일) 구독 생성
    const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from('spokedu_pro_subscriptions').insert({
      center_id: center.id,
      plan: 'basic',
      status: 'trialing',
      trial_end: trialEnd,
      max_classes: 3,
    });

    return NextResponse.json(
      { ok: true, bootstrapped: true, centerId: center.id, centerName: center.name },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: 'internal', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
