/**
 * 강사 Auth ↔ public.users id 동기화 (이메일로 조회)
 * 관리자만 호출. Service Role로 Auth 조회 후 public_id → auth_id 맞춤.
 */
import { NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    if (!email) {
      return NextResponse.json({ error: 'email 필드 필요' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const emailLower = email.toLowerCase();

    // auth.users에서 이메일로 조회, 없으면 public.users id를 auth_id로 간주
    const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const usersList = (listData as { users?: { id: string; email?: string }[] })?.users ?? [];
    const authUser = usersList.find((u) => u.email?.toLowerCase() === emailLower);

    const { data: usersWithEmail, error: fetchErr } = await supabase.from('users').select('*').ilike('email', email);
    if (fetchErr || !usersWithEmail?.length) {
      return NextResponse.json({ error: 'public.users에 해당 이메일이 없습니다.' }, { status: 404 });
    }

    // auth에서 못 찾으면 public.users에서 이메일 일치하는 행 중 auth.users에 실제 존재하는 id를 auth_id로 사용
    let authId: string;
    let resolvedAuthUser: { id: string; email?: string } | undefined = authUser;
    if (!authUser) {
      for (const row of usersWithEmail as { id: string }[]) {
        const { data: found } = await supabase.auth.admin.getUserById(row.id);
        if (found?.user) { resolvedAuthUser = found.user; break; }
      }
      if (!resolvedAuthUser) {
        return NextResponse.json({ error: 'Auth에 해당 이메일 사용자가 없습니다. Supabase에서 계정을 먼저 생성하세요.' }, { status: 404 });
      }
    }
    authId = resolvedAuthUser!.id;

    const canonical = usersWithEmail.find((u: { id: string }) => u.id === authId);
    const otherIds = usersWithEmail.filter((u: { id: string }) => u.id !== authId).map((u: { id: string }) => u.id);

    for (const oldId of otherIds) {
      await supabase.from('sessions').update({ created_by: authId }).eq('created_by', oldId);
      await supabase.from('mileage_logs').update({ teacher_id: authId }).eq('teacher_id', oldId);
      await supabase.from('session_count_logs').update({ teacher_id: authId }).eq('teacher_id', oldId);
      const { data: setExists } = await supabase.from('settlements').select('id').limit(1);
      if (setExists?.length) await supabase.from('settlements').update({ teacher_id: authId }).eq('teacher_id', oldId);
      await supabase.from('inventory').update({ user_id: authId }).eq('user_id', oldId);
      const { data: invLogExists } = await supabase.from('inventory_logs').select('id').limit(1);
      if (invLogExists?.length) await supabase.from('inventory_logs').update({ user_id: authId }).eq('user_id', oldId);
      const { data: lpRow } = await supabase.from('lesson_plans').select('teacher_id').limit(1).maybeSingle();
      if (lpRow && 'teacher_id' in lpRow) await supabase.from('lesson_plans').update({ teacher_id: authId }).eq('teacher_id', oldId);
      const { data: chatRow } = await supabase.from('chat_participants').select('id').limit(1);
      if (chatRow?.length) await supabase.from('chat_participants').update({ user_id: authId }).eq('user_id', oldId);
      await supabase.from('users').delete().eq('id', oldId);
    }

    if (!canonical && otherIds.length > 0) {
      const source = usersWithEmail[0] as Record<string, unknown>;
      const newRow: Record<string, unknown> = {
        id: authId,
        email: source.email,
        name: source.name,
        role: source.role ?? 'teacher',
        is_active: source.is_active ?? true,
        points: source.points ?? 0,
        documents: source.documents ?? null,
        phone: source.phone ?? null,
        organization: source.organization ?? null,
        departure_location: source.departure_location ?? null,
        schedule: source.schedule ?? null,
        vacation: source.vacation ?? null,
        created_at: source.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (source.ending_soon !== undefined) newRow.ending_soon = source.ending_soon;
      if (source.is_admin !== undefined) newRow.is_admin = source.is_admin;
      if (source.session_count !== undefined) newRow.session_count = source.session_count;
      await supabase.from('users').insert(newRow);
    }

    await supabase.from('profiles').upsert({ id: authId, email: resolvedAuthUser?.email || email, role: 'teacher' }, { onConflict: 'id' });

    if (otherIds.length > 0) {
      return NextResponse.json({ ok: true, message: `수업·정산 등 ${otherIds.length}개 id 정리 후 연동 완료. 해당 강사 로그아웃 후 재로그인 하세요.` });
    }
    return NextResponse.json({ ok: true, message: 'profiles 반영 완료. 해당 강사 로그아웃 후 재로그인 하세요.' });
  } catch (err) {
    console.error('[admin/teachers/sync-by-email]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
