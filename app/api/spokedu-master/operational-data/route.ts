import { reportError } from '@/app/lib/monitoring/errorReporter';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { privateNoStoreJson, withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { requireSpokeduMasterAccess } from '@/app/lib/server/spokeduMasterAccess';
import { MASTER_DATA_DELETE_CONFIRMATION } from '@/app/spokedu-master/profile/masterDataDeletion';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const CONFIRMATION_MISMATCH_MESSAGE = '확인 문구가 일치하지 않습니다.';
const DELETE_FAILURE_MESSAGE = 'MASTER 데이터를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.';
const INVALID_DELETE_REQUEST_MESSAGE = '유효하지 않은 삭제 요청입니다.';

type RpcError = {
  code?: string;
  message?: string;
};

async function readConfirmation(request: Request): Promise<string | null> {
  try {
    const body = (await request.json()) as { confirmation?: unknown };
    return typeof body.confirmation === 'string' ? body.confirmation : null;
  } catch {
    return null;
  }
}

function isExpectedRpcInputError(error: RpcError | null) {
  return error?.code === '22023' || error?.code === '22P02';
}

async function deleteOwnerOperationalData(ownerId: string) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.rpc('spokedu_master_delete_operational_data', {
    p_owner_id: ownerId,
  });

  if (error) {
    const status = isExpectedRpcInputError(error) ? 400 : 500;
    await reportError(error, {
      context: 'spokedu_master.privacy_delete',
      tags: {
        code: error.code,
        stage: 'delete_operational_data_rpc',
        status,
      },
    });
    return { ok: false as const, status };
  }

  return { data, ok: true as const };
}

export async function DELETE(request: Request) {
  const access = await requireSpokeduMasterAccess();
  if (!access.ok) return withPrivateNoStore(access.response);

  const confirmation = await readConfirmation(request);
  if (confirmation !== MASTER_DATA_DELETE_CONFIRMATION) {
    return privateNoStoreJson(
      { error: CONFIRMATION_MISMATCH_MESSAGE },
      { status: 400 },
    );
  }

  const result = await deleteOwnerOperationalData(access.userId);
  if (!result.ok) {
    return privateNoStoreJson(
      { error: result.status === 400 ? INVALID_DELETE_REQUEST_MESSAGE : DELETE_FAILURE_MESSAGE },
      { status: result.status },
    );
  }

  return privateNoStoreJson({ ok: true, deleted: result.data ?? null });
}
