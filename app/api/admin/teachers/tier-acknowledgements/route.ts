import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { isActualClassOpsTeacher } from '@/app/admin/classes/lib/classOpsTeacherSelection';
import { computeTier, totalLessonsFromCounts } from '@/app/lib/teacherTierSchedule';

const requestSchema = z.object({
  teacherId: z.string().uuid(),
  tierId: z.enum(['silver', 'gold', 'diamond', 'partner']),
});
const headers = { 'Cache-Control': 'private, no-store' };

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const service = getServiceSupabase();
  const acknowledgements: { teacher_id: string; tier_id: string }[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await service.from('teacher_tier_acknowledgements')
      .select('teacher_id, tier_id').order('teacher_id').order('tier_id')
      .range(offset, offset + pageSize - 1);
    if (error) return NextResponse.json({ error: '승급 확인 상태를 불러오지 못했습니다.' }, { status: 500, headers });
    acknowledgements.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return NextResponse.json({ acknowledgements }, { headers });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '잘못된 확인 요청입니다.' }, { status: 400, headers });
  const { teacherId, tierId } = parsed.data;
  const service = getServiceSupabase();
  const [teacherResult, countResult] = await Promise.all([
    service.from('users').select('id, name, email, role, is_admin, session_count').eq('id', teacherId).maybeSingle(),
    service.from('session_count_logs').select('id', { count: 'exact', head: true }).eq('teacher_id', teacherId),
  ]);
  if (teacherResult.error || countResult.error || countResult.count == null) {
    return NextResponse.json({ error: '강사 등급을 확인하지 못했습니다.' }, { status: 500, headers });
  }
  const teacher = teacherResult.data;
  if (!teacher || !isActualClassOpsTeacher(teacher)) {
    return NextResponse.json({ error: '대상 강사를 찾을 수 없습니다.' }, { status: 404, headers });
  }
  const currentTier = computeTier(totalLessonsFromCounts(teacher.session_count, countResult.count));
  if (tierId !== currentTier) {
    return NextResponse.json({ error: '등급이 변경되었습니다. 강사 정보를 새로고침해 주세요.' }, { status: 409, headers });
  }
  // Ignore concurrent duplicates so the first administrator and timestamp remain intact.
  const { error } = await service.from('teacher_tier_acknowledgements').upsert({
    teacher_id: teacherId,
    tier_id: tierId,
    acknowledged_by: auth.userId,
  }, { onConflict: 'teacher_id,tier_id', ignoreDuplicates: true });
  if (error) return NextResponse.json({ error: '승급 확인을 저장하지 못했습니다.' }, { status: 500, headers });
  return NextResponse.json({ teacherId, tierId }, { headers });
}
