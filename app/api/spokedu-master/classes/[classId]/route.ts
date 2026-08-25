import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { privateNoStoreJson, withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { requireSpokeduMasterCapability } from '@/app/lib/server/spokeduMasterAccess';
import type { MasterClassDto } from '@/app/spokedu-master/types/operational';

export async function PATCH(request: Request, context: { params: Promise<{ classId: string }> }) {
  const access = await requireSpokeduMasterCapability('attendance');
  if (!access.ok) return withPrivateNoStore(access.response);
  const { classId } = await context.params;
  const body = await request.json().catch(() => null) as { name?: unknown } | null;
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name) return privateNoStoreJson({ error: '수업반 이름을 입력해 주세요.' }, { status: 400 });

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('spokedu_master_classes')
    .update({ name })
    .eq('id', classId)
    .eq('owner_id', access.userId)
    .is('deleted_at', null)
    .select('id,name,created_at,updated_at')
    .maybeSingle();
  if (error) {
    return privateNoStoreJson(
      { error: error.code === '23505' ? '같은 이름의 수업반이 이미 있습니다.' : '수업반 이름을 바꾸지 못했습니다.' },
      { status: error.code === '23505' ? 409 : 500 },
    );
  }
  if (!data) return privateNoStoreJson({ error: '수업반을 찾지 못했습니다.' }, { status: 404 });

  const { data: memberships, error: membershipError } = await supabase
    .from('spokedu_master_class_students')
    .select('student_id')
    .eq('owner_id', access.userId)
    .eq('class_id', classId);
  if (membershipError) return privateNoStoreJson({ error: '수업반 명단을 불러오지 못했습니다.' }, { status: 500 });
  const result: MasterClassDto = {
    id: data.id,
    name: data.name,
    studentIds: (memberships ?? []).map((item) => item.student_id),
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
  return privateNoStoreJson({ data: result });
}
