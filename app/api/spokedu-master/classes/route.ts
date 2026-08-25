import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { privateNoStoreJson, withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { requireSpokeduMasterCapability } from '@/app/lib/server/spokeduMasterAccess';
import type { MasterClassDto } from '@/app/spokedu-master/types/operational';

function readName(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const name = typeof (value as { name?: unknown }).name === 'string'
    ? (value as { name: string }).name.trim()
    : '';
  return name || null;
}

export async function POST(request: Request) {
  const access = await requireSpokeduMasterCapability('attendance');
  if (!access.ok) return withPrivateNoStore(access.response);
  const name = readName(await request.json().catch(() => null));
  if (!name) return privateNoStoreJson({ error: '수업반 이름을 입력해 주세요.' }, { status: 400 });

  const { data, error } = await getServiceSupabase()
    .from('spokedu_master_classes')
    .insert({ owner_id: access.userId, name })
    .select('id,name,created_at,updated_at')
    .single();
  if (error) {
    return privateNoStoreJson(
      { error: error.code === '23505' ? '같은 이름의 수업반이 이미 있습니다.' : '수업반을 만들지 못했습니다.' },
      { status: error.code === '23505' ? 409 : 500 },
    );
  }
  const result: MasterClassDto = {
    id: data.id,
    name: data.name,
    studentIds: [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
  return privateNoStoreJson({ data: result }, { status: 201 });
}
