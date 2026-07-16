import { reportError } from '@/app/lib/monitoring/errorReporter';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { privateNoStoreJson, withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { requireSpokeduMasterAccess } from '@/app/lib/server/spokeduMasterAccess';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const FAVORITES_SERVER_ERROR = '즐겨찾기를 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';

type FavoriteRow = {
  program_id: string;
};

function normalizeProgramIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.filter((programId): programId is string => {
    if (typeof programId !== 'string' || !programId.trim() || seen.has(programId)) return false;
    seen.add(programId);
    return true;
  });
}

export async function GET() {
  const access = await requireSpokeduMasterAccess();
  if (!access.ok) return withPrivateNoStore(access.response);

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('spokedu_master_program_favorites')
    .select('program_id')
    .eq('owner_id', access.userId)
    .order('created_at', { ascending: true });

  if (error) {
    await reportError(error, {
      context: 'spokedu_master.program_favorites',
      tags: { method: 'GET', stage: 'select', status: 500 },
    });
    return privateNoStoreJson({ error: FAVORITES_SERVER_ERROR }, { status: 500 });
  }

  const programIds = normalizeProgramIds((data ?? []).map((row) => (row as FavoriteRow).program_id));
  return privateNoStoreJson({ data: programIds });
}

export async function PUT(request: Request) {
  const access = await requireSpokeduMasterAccess();
  if (!access.ok) return withPrivateNoStore(access.response);

  let programIds: string[];
  try {
    const body = (await request.json()) as { programIds?: unknown };
    programIds = normalizeProgramIds(body.programIds);
  } catch {
    return privateNoStoreJson({ error: '유효하지 않은 즐겨찾기 요청입니다.' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { data: existingRows, error: existingError } = await supabase
    .from('spokedu_master_program_favorites')
    .select('program_id')
    .eq('owner_id', access.userId);

  if (existingError) {
    await reportError(existingError, {
      context: 'spokedu_master.program_favorites',
      tags: { method: 'PUT', stage: 'select_existing', status: 500 },
    });
    return privateNoStoreJson({ error: FAVORITES_SERVER_ERROR }, { status: 500 });
  }

  const existingIds = new Set(
    normalizeProgramIds((existingRows ?? []).map((row) => (row as FavoriteRow).program_id)),
  );
  const nextIds = new Set(programIds);
  const toDelete = [...existingIds].filter((programId) => !nextIds.has(programId));
  const toInsert = programIds.filter((programId) => !existingIds.has(programId));

  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('spokedu_master_program_favorites')
      .delete()
      .eq('owner_id', access.userId)
      .in('program_id', toDelete);

    if (deleteError) {
      await reportError(deleteError, {
        context: 'spokedu_master.program_favorites',
        tags: { method: 'PUT', stage: 'delete', status: 500 },
      });
      return privateNoStoreJson({ error: FAVORITES_SERVER_ERROR }, { status: 500 });
    }
  }

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase.from('spokedu_master_program_favorites').insert(
      toInsert.map((programId) => ({
        owner_id: access.userId,
        program_id: programId,
      })),
    );

    if (insertError) {
      await reportError(insertError, {
        context: 'spokedu_master.program_favorites',
        tags: { method: 'PUT', stage: 'insert', status: 500 },
      });
      return privateNoStoreJson({ error: FAVORITES_SERVER_ERROR }, { status: 500 });
    }
  }

  return privateNoStoreJson({ data: programIds });
}
