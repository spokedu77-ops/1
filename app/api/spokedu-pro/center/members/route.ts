/**
 * /api/spokedu-pro/center/members
 * GET  ?centerId=UUID — 센터 멤버 목록 조회
 * POST { email, role, centerId } — 멤버 추가 (이메일로 사용자 조회 후 추가)
 * DELETE { userId, centerId } — 멤버 제거
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type CenterRole = 'owner' | 'admin' | 'coach';

// GET /api/spokedu-pro/center/members?centerId=UUID
export async function GET(req: NextRequest) {
  try {
    const serverSupabase = await createServerSupabaseClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const centerId = url.searchParams.get('centerId');
    if (!centerId) return NextResponse.json({ error: 'centerId is required' }, { status: 400 });

    const supabase = getServiceSupabase();

    // 요청자가 센터 멤버인지 확인
    const { data: requesterMember } = await supabase
      .from('spokedu_pro_center_members')
      .select('role')
      .eq('center_id', centerId)
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: ownedCenter } = await supabase
      .from('spokedu_pro_centers')
      .select('id')
      .eq('id', centerId)
      .eq('owner_id', user.id)
      .maybeSingle();

    if (!requesterMember && !ownedCenter) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: memberRows } = await supabase
      .from('spokedu_pro_center_members')
      .select('user_id, role, created_at')
      .eq('center_id', centerId)
      .order('created_at', { ascending: true });

    // 이메일 조회: listUsers 1회 호출로 N+1 쿼리 방지
    const { data: { users: allUsers } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const userEmailMap = new Map(allUsers?.map((u) => [u.id, u.email]) ?? []);

    const members = (memberRows ?? []).map((row) => ({
      userId: row.user_id,
      email: userEmailMap.get(row.user_id) ?? row.user_id,
      role: row.role as CenterRole,
      joinedAt: row.created_at as string,
    }));

    return NextResponse.json({ ok: true, members });
  } catch (err) {
    console.error('[center/members GET]', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// POST /api/spokedu-pro/center/members
export async function POST(req: NextRequest) {
  try {
    const serverSupabase = await createServerSupabaseClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: { email?: string; role?: string; centerId?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { email, role, centerId } = body;

    if (!email) return NextResponse.json({ error: '이메일을 입력해주세요.' }, { status: 400 });
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: '올바른 이메일 형식이 아닙니다.' }, { status: 400 });
    }
    if (!centerId) return NextResponse.json({ error: 'centerId is required' }, { status: 400 });

    const validRoles: CenterRole[] = ['admin', 'coach'];
    const memberRole: CenterRole = validRoles.includes(role as CenterRole) ? (role as CenterRole) : 'coach';

    const supabase = getServiceSupabase();

    // 요청자가 오너 또는 관리자인지 확인
    const { data: requesterMember } = await supabase
      .from('spokedu_pro_center_members')
      .select('role')
      .eq('center_id', centerId)
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: ownedCenter } = await supabase
      .from('spokedu_pro_centers')
      .select('id')
      .eq('id', centerId)
      .eq('owner_id', user.id)
      .maybeSingle();

    const isOwner = !!ownedCenter;
    const isAdmin = requesterMember?.role === 'admin' || requesterMember?.role === 'owner';

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    // 이메일로 사용자 조회
    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
    const targetUser = authUsers?.find((u) => u.email === email);

    if (!targetUser) {
      return NextResponse.json({ error: '해당 이메일의 사용자를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 이미 멤버인지 확인
    const { data: existingMember } = await supabase
      .from('spokedu_pro_center_members')
      .select('user_id')
      .eq('center_id', centerId)
      .eq('user_id', targetUser.id)
      .maybeSingle();

    if (existingMember) {
      return NextResponse.json({ error: '이미 센터 멤버입니다.' }, { status: 409 });
    }

    const now = new Date().toISOString();
    const { error: insertErr } = await supabase
      .from('spokedu_pro_center_members')
      .insert({ center_id: centerId, user_id: targetUser.id, role: memberRole });

    if (insertErr) {
      console.error('[center/members POST insert]', insertErr);
      return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      member: {
        userId: targetUser.id,
        email: targetUser.email ?? email,
        role: memberRole,
        joinedAt: now,
      },
    }, { status: 201 });
  } catch (err) {
    console.error('[center/members POST]', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// DELETE /api/spokedu-pro/center/members
export async function DELETE(req: NextRequest) {
  try {
    const serverSupabase = await createServerSupabaseClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: { userId?: string; centerId?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { userId, centerId } = body;
    if (!userId || !centerId) {
      return NextResponse.json({ error: 'userId와 centerId가 필요합니다.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    // 요청자가 오너 또는 관리자인지 확인
    const { data: requesterMember } = await supabase
      .from('spokedu_pro_center_members')
      .select('role')
      .eq('center_id', centerId)
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: ownedCenter } = await supabase
      .from('spokedu_pro_centers')
      .select('id')
      .eq('id', centerId)
      .eq('owner_id', user.id)
      .maybeSingle();

    const isOwner = !!ownedCenter;
    const isAdmin = requesterMember?.role === 'admin' || requesterMember?.role === 'owner';

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    // 오너는 삭제 불가
    const { data: targetMember } = await supabase
      .from('spokedu_pro_center_members')
      .select('role')
      .eq('center_id', centerId)
      .eq('user_id', userId)
      .maybeSingle();

    if (targetMember?.role === 'owner') {
      return NextResponse.json({ error: '오너는 삭제할 수 없습니다.' }, { status: 403 });
    }

    const { error: deleteErr } = await supabase
      .from('spokedu_pro_center_members')
      .delete()
      .eq('center_id', centerId)
      .eq('user_id', userId);

    if (deleteErr) {
      console.error('[center/members DELETE]', deleteErr);
      return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[center/members DELETE]', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
