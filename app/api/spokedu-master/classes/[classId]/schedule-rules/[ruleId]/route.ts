import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { privateNoStoreJson, withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { requireSpokeduMasterCapability } from '@/app/lib/server/spokeduMasterAccess';

export async function PATCH(request: Request, context: { params: Promise<{ classId: string; ruleId: string }> }) {
  const access = await requireSpokeduMasterCapability('attendance');
  if (!access.ok) return withPrivateNoStore(access.response);
  const { classId, ruleId } = await context.params;
  const body = await request.json().catch(() => null) as { active?: unknown } | null;
  if (typeof body?.active !== 'boolean') return privateNoStoreJson({ error: '변경할 일정 상태를 확인해 주세요.' }, { status: 400 });
  const { data, error } = await getServiceSupabase().from('spokedu_master_class_schedule_rules')
    .update({ active: body.active, updated_at: new Date().toISOString() }).eq('id', ruleId).eq('class_id', classId).eq('owner_id', access.userId)
    .select('id,active').maybeSingle();
  if (error || !data) return privateNoStoreJson({ error: '정기 일정을 변경하지 못했습니다.' }, { status: 404 });
  return privateNoStoreJson({ data });
}
