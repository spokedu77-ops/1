/**
 * 강사 자료(공지·커리큘럼·SPOMOVE) 접근 권한 확인
 * teacher layout / page 에서 호출
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { canAccessTeacherMaterials } from '@/app/lib/server/teacherAuth';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return NextResponse.json(
      { allowed: false, reason: 'no-session' as const },
      { status: 200 },
    );
  }

  const allowed = await canAccessTeacherMaterials(user, supabase);
  return NextResponse.json({
    allowed,
    reason: allowed ? undefined : ('inactive_teacher' as const),
  });
}
