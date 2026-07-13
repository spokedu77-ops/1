/**
 * 강사 자료(공지·커리큘럼·SPOMOVE) 접근 권한 검사
 *
 * 종료 처리된 강사(users.is_active = false)는 자료 열람 불가.
 * 플랫폼 관리자는 teacher 화면을 볼 때도 접근 허용.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { isPlatformAdminUser } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';

export type TeacherMaterialsAuthOk = { ok: true; userId: string };
export type TeacherMaterialsAuthFail = { ok: false; response: NextResponse };
export type TeacherMaterialsAuthResult = TeacherMaterialsAuthOk | TeacherMaterialsAuthFail;

type ServerSupabase = Awaited<ReturnType<typeof createServerSupabaseClient>>;

/**
 * 공지·커리큘럼·SPOMOVE 열람 가능 여부.
 * 로그인하지 않았거나 종료 강사면 false.
 */
export async function canAccessTeacherMaterials(
  user: { id: string; email?: string | null },
  serverSupabase?: ServerSupabase,
): Promise<boolean> {
  const supabase = serverSupabase ?? (await createServerSupabaseClient());

  if (await isPlatformAdminUser(user, supabase)) {
    return true;
  }

  const { data, error } = await supabase
    .from('users')
    .select('is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    devLogger.error('[canAccessTeacherMaterials] users lookup failed', error);
    return false;
  }

  return data?.is_active !== false;
}

/** API 라우트용 — 종료 강사는 403 */
export async function requireTeacherMaterialsAccess(): Promise<TeacherMaterialsAuthResult> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return {
        ok: false,
        response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      };
    }

    const allowed = await canAccessTeacherMaterials(user, supabase);
    if (!allowed) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Forbidden', reason: 'inactive_teacher' },
          { status: 403 },
        ),
      };
    }

    return { ok: true, userId: user.id };
  } catch (err) {
    devLogger.error('[requireTeacherMaterialsAccess]', err);
    return {
      ok: false,
      response: NextResponse.json({ error: 'Server error' }, { status: 500 }),
    };
  }
}
