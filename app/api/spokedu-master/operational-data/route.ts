import { reportError } from '@/app/lib/monitoring/errorReporter';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { privateNoStoreJson, withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { requireSpokeduMasterAccess } from '@/app/lib/server/spokeduMasterAccess';
import { MASTER_DATA_DELETE_CONFIRMATION } from '@/app/spokedu-master/profile/masterDataDeletion';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DELETE_FAILURE_MESSAGE = 'MASTER 데이터를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.';

const OPERATIONAL_DELETE_TABLES = [
  'spokedu_master_explanations',
  'spokedu_master_class_records',
  'spokedu_master_class_record_students',
  'spokedu_master_students',
] as const;

async function readConfirmation(request: Request): Promise<string | null> {
  try {
    const body = (await request.json()) as { confirmation?: unknown };
    return typeof body.confirmation === 'string' ? body.confirmation : null;
  } catch {
    return null;
  }
}

async function deleteOwnerRows(ownerId: string) {
  const supabase = getServiceSupabase();

  for (const table of OPERATIONAL_DELETE_TABLES) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('owner_id', ownerId);

    if (error) {
      await reportError(error, {
        context: 'spokedu_master.privacy_delete',
        tags: {
          stage: 'delete_owner_rows',
          status: 500,
          table,
        },
      });
      return { ok: false as const, table };
    }
  }

  return { ok: true as const };
}

export async function DELETE(request: Request) {
  const access = await requireSpokeduMasterAccess();
  if (!access.ok) return withPrivateNoStore(access.response);

  const confirmation = await readConfirmation(request);
  if (confirmation !== MASTER_DATA_DELETE_CONFIRMATION) {
    return privateNoStoreJson(
      { error: '확인 문구가 일치하지 않습니다.' },
      { status: 400 },
    );
  }

  const result = await deleteOwnerRows(access.userId);
  if (!result.ok) {
    return privateNoStoreJson(
      { error: DELETE_FAILURE_MESSAGE },
      { status: 500 },
    );
  }

  return privateNoStoreJson({ ok: true });
}
