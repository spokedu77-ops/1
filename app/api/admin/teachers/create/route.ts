/**
 * 강사 계정 생성
 * - Supabase Auth 계정 생성 + public.users 동일 id로 동시 생성
 * - 처음부터 auth_id = public_id → 연동 불일치 문제 없음
 */
import { NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { defaultTeacherEmail } from '@/app/lib/constants/domain';

function generatePassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) return NextResponse.json({ error: '이름을 입력해주세요.' }, { status: 400 });

    const email = (typeof body.email === 'string' && body.email.trim())
      ? body.email.trim().toLowerCase()
      : defaultTeacherEmail(name);

    const supabase = getServiceSupabase();

    // 이미 존재하는 이메일인지 확인
    const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const existing = (listData as { users?: { email?: string }[] })?.users?.find(
      (u) => u.email?.toLowerCase() === email
    );
    if (existing) return NextResponse.json({ error: `이미 존재하는 이메일입니다: ${email}` }, { status: 409 });

    const initialPassword = generatePassword();

    // Auth 계정 생성
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: initialPassword,
      email_confirm: true,
    });
    if (authError || !authData?.user) {
      return NextResponse.json({ error: authError?.message || '계정 생성 실패' }, { status: 500 });
    }

    const authId = authData.user.id;

    // public.users에 동일 id로 행 생성 (auth_id = public_id → 연동 불일치 없음)
    const { error: insertError } = await supabase.from('users').insert({
      id: authId,
      email,
      name,
      role: 'teacher',
      is_active: true,
      points: 0,
      documents: [],
      phone: body.phone ?? null,
      organization: body.organization ?? null,
      departure_location: body.departure_location ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (insertError) {
      // public.users 삽입 실패 시 auth 계정도 롤백
      await supabase.auth.admin.deleteUser(authId);
      return NextResponse.json({ error: `사용자 정보 저장 실패: ${insertError.message}` }, { status: 500 });
    }

    return NextResponse.json({ ok: true, email, initialPassword });
  } catch (err) {
    console.error('[admin/teachers/create]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
