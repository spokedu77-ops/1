import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { reportError } from '@/app/lib/monitoring/errorReporter';
import { privateNoStoreJson, withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { requireSpokeduMasterSession } from '@/app/lib/server/spokeduMasterAccess';
import {
  getSpokeduMasterProfile,
  normalizeSpokeduMasterProfileInput,
  toSpokeduMasterProfileDto,
  upsertSpokeduMasterProfile,
} from '@/app/lib/server/spokeduMasterProfile';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PROFILE_SERVER_ERROR = '프로필을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';

export async function GET() {
  const session = await requireSpokeduMasterSession();
  if (!session.ok) return withPrivateNoStore(session.response);

  const supabase = getServiceSupabase();
  const { row, error } = await getSpokeduMasterProfile(supabase, session.userId);
  if (error) {
    await reportError(error, {
      context: 'spokedu_master.profile',
      tags: { method: 'GET', stage: 'select', status: 500 },
    });
    return privateNoStoreJson({ error: PROFILE_SERVER_ERROR }, { status: 500 });
  }

  return privateNoStoreJson({
    data: row ? toSpokeduMasterProfileDto(row) : null,
  });
}

export async function PATCH(request: Request) {
  const session = await requireSpokeduMasterSession();
  if (!session.ok) return withPrivateNoStore(session.response);

  let input;
  try {
    input = normalizeSpokeduMasterProfileInput(await request.json());
  } catch (error) {
    return privateNoStoreJson(
      { error: error instanceof Error ? error.message : 'Invalid profile payload' },
      { status: 400 },
    );
  }

  const supabase = getServiceSupabase();
  const { row, error } = await upsertSpokeduMasterProfile(supabase, session.userId, input);
  if (error) {
    await reportError(error, {
      context: 'spokedu_master.profile',
      tags: { method: 'PATCH', stage: 'upsert', status: 500 },
    });
    return privateNoStoreJson({ error: PROFILE_SERVER_ERROR }, { status: 500 });
  }

  return privateNoStoreJson({
    data: row ? toSpokeduMasterProfileDto(row) : null,
  });
}
