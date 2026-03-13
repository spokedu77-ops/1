/**
 * 강사 비밀번호 재설정 (관리자 전용)
 * - 가상 이메일 등으로 비밀번호 찾기 불가 시 사용
 * - Auth 비밀번호만 변경, 이메일 발송 없음
 */
import { NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';

function generatePassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await request.json().catch(() => ({}));
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    if (!userId) return NextResponse.json({ error: 'userId가 필요합니다.' }, { status: 400 });

    const supabase = getServiceSupabase();
    const newPassword = generatePassword();

    const { data, error } = await supabase.auth.admin.updateUserById(userId, { password: newPassword });
    if (error) {
      return NextResponse.json({ error: error.message || '비밀번호 변경 실패' }, { status: 500 });
    }

    const email = data?.user?.email ?? '';
    return NextResponse.json({ ok: true, email, initialPassword: newPassword });
  } catch (err) {
    devLogger.error('[admin/teachers/reset-password]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
