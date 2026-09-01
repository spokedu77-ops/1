import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { privateNoStoreJson, withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { requireSpokeduMasterCapability } from '@/app/lib/server/spokeduMasterAccess';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MAX_PARENT_NOTICE_LENGTH = 4000;

export async function PATCH(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const access = await requireSpokeduMasterCapability('records');
  if (!access.ok) return withPrivateNoStore(access.response);

  const { sessionId } = await context.params;
  const body = await request.json().catch(() => null) as { parentNotice?: unknown } | null;
  if (typeof body?.parentNotice !== 'string' || body.parentNotice.length > MAX_PARENT_NOTICE_LENGTH) {
    return privateNoStoreJson({ error: '안내문은 4,000자 이내로 입력해 주세요.' }, { status: 400 });
  }
  const parentNotice = body.parentNotice.trim() || null;
  const { data, error } = await getServiceSupabase()
    .from('spokedu_master_sessions')
    .update({ parent_notice: parentNotice })
    .eq('id', sessionId)
    .eq('owner_id', access.userId)
    .eq('status', 'completed')
    .is('deleted_at', null)
    .select('parent_notice')
    .maybeSingle();

  if (error) return privateNoStoreJson({ error: '안내문을 저장하지 못했습니다.' }, { status: 500 });
  if (!data) return privateNoStoreJson({ error: '수정할 수 있는 완료 수업을 찾지 못했습니다.' }, { status: 404 });
  return privateNoStoreJson({ data: { parentNotice: data.parent_notice as string | null } });
}
