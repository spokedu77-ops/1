/**
 * /api/spokedu-pro/center/members
 * GET  — 센터 멤버 목록 조회
 * POST — 이메일로 강사 초대 (멤버 추가)
 *
 * 플랜별 강사 수 제한:
 *   free/basic: 본인(owner) 포함 1명 = 추가 불가
 *   pro: 최대 5명 (owner 포함)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';

const DB_READY = process.env.SPOKEDU_PRO_DB_READY === 'true';
const COACH_LIMITS: Record<string, number> = { free: 1, basic: 1, pro: 5 };

export async function GET() {
  const serverSupabase = await createServerSupabaseClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!DB_READY) return NextResponse.json({ error: 'DB not ready' }, { status: 503 });

  const supabase = getServiceSupabase();

  const { data: ownedCenter } = await supabase
    .from('spokedu_pro_centers')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (!ownedCenter) return NextResponse.json({ error: 'No center found' }, { status: 404 });

  const { data: members, error } = await supabase
    .from('spokedu_pro_center_members')
    .select('id, user_id, role, joined_at')
    .eq('center_id', ownedCenter.id)
    .order('joined_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 이메일 정보는 auth.users에서 조회 (service role 필요)
  const userIds = (members ?? []).map((m) => m.user_id);
  const emailMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    for (const u of authUsers?.users ?? []) {
      if (userIds.includes(u.id)) {
        emailMap[u.id] = u.email ?? '';
      }
    }
  }

  const enriched = (members ?? []).map((m) => ({
    id: m.id,
    userId: m.user_id,
    email: emailMap[m.user_id] ?? '',
    role: m.role,
    joinedAt: m.joined_at,
  }));

  return NextResponse.json({ ok: true, members: enriched });
}

export async function POST(req: NextRequest) {
  const serverSupabase = await createServerSupabaseClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!DB_READY) return NextResponse.json({ error: 'DB not ready' }, { status: 503 });

  let body: { email?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 });

  const role = body.role ?? 'coach';
  if (!['admin', 'coach'].includes(role)) {
    return NextResponse.json({ error: 'role must be admin or coach' }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  // 센터 확인
  const { data: ownedCenter } = await supabase
    .from('spokedu_pro_centers')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (!ownedCenter) return NextResponse.json({ error: 'No center found' }, { status: 404 });

  // 플랜 조회
  const { data: sub } = await supabase
    .from('spokedu_pro_subscriptions')
    .select('plan, status')
    .eq('center_id', ownedCenter.id)
    .maybeSingle();

  const plan = sub?.plan ?? 'free';
  const isActive = !sub || sub.status === 'active' || sub.status === 'trialing';
  const coachLimit = isActive ? (COACH_LIMITS[plan] ?? 1) : 1;

  // 현재 멤버 수 확인 (owner 포함)
  const { count: memberCount } = await supabase
    .from('spokedu_pro_center_members')
    .select('*', { count: 'exact', head: true })
    .eq('center_id', ownedCenter.id);

  const totalWithOwner = (memberCount ?? 0) + 1; // +1 for owner
  if (totalWithOwner >= coachLimit) {
    return NextResponse.json(
      { error: 'coach_limit_reached', limit: coachLimit, plan },
      { status: 403 }
    );
  }

  // 초대할 사용자 이메일로 검색
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const targetUser = authUsers?.users?.find(
    (u) => u.email?.toLowerCase() === email
  );

  if (!targetUser) {
    return NextResponse.json(
      { error: 'User not found. They must sign up for Spokedu first.' },
      { status: 404 }
    );
  }

  if (targetUser.id === user.id) {
    return NextResponse.json({ error: 'Cannot invite yourself' }, { status: 400 });
  }

  // 이미 멤버인지 확인
  const { data: existing } = await supabase
    .from('spokedu_pro_center_members')
    .select('id')
    .eq('center_id', ownedCenter.id)
    .eq('user_id', targetUser.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'User is already a member' }, { status: 409 });
  }

  // 멤버 추가
  const { data: newMember, error } = await supabase
    .from('spokedu_pro_center_members')
    .insert({
      center_id: ownedCenter.id,
      user_id: targetUser.id,
      role,
      joined_at: new Date().toISOString(),
    })
    .select('id, user_id, role, joined_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    member: {
      id: newMember.id,
      userId: newMember.user_id,
      email: targetUser.email ?? '',
      role: newMember.role,
      joinedAt: newMember.joined_at,
    },
  }, { status: 201 });
}
