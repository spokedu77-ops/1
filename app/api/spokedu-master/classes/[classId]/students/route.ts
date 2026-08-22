import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { privateNoStoreJson, withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { requireSpokeduMasterAccess } from '@/app/lib/server/spokeduMasterAccess';

export async function POST(request: Request, context: { params: Promise<{ classId: string }> }) {
  const access = await requireSpokeduMasterAccess();
  if (!access.ok) return withPrivateNoStore(access.response);
  const { classId } = await context.params;
  const body = await request.json().catch(() => null) as { studentId?: unknown } | null;
  if (typeof body?.studentId !== 'string') return privateNoStoreJson({ error: '학생을 선택해 주세요.' }, { status: 400 });
  const { error } = await getServiceSupabase().from('spokedu_master_class_students').upsert({
    owner_id: access.userId, class_id: classId, student_id: body.studentId,
  }, { onConflict: 'class_id,student_id', ignoreDuplicates: true });
  if (error) return privateNoStoreJson({ error: error.code === '23514' ? '수업반과 학생을 확인해 주세요.' : '수업반 등록에 실패했습니다.' }, { status: error.code === '23514' ? 400 : 500 });
  return privateNoStoreJson({ ok: true }, { status: 201 });
}
