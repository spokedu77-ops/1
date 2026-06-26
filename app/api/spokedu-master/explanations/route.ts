import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { privateNoStoreJson, withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { requireSpokeduMasterAccess } from '@/app/lib/server/spokeduMasterAccess';
import { reportError } from '@/app/lib/monitoring/errorReporter';
import {
  explanationInsertPayload,
  normalizeExplanationInput,
  toExplanationDto,
  type MasterExplanationRow,
} from '../explanations-data';

const EXPLANATION_SELECT = `
  id,
  owner_id,
  program_id,
  program_title,
  audience,
  explanation_text,
  created_at
`;

const EXPLANATION_ID_SELECT = 'id';
const EXPLANATION_SERVER_ERROR = '리포트를 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request?: Request) {
  const access = await requireSpokeduMasterAccess();
  if (!access.ok) return withPrivateNoStore(access.response);

  const supabase = getServiceSupabase();
  const savedId = request ? new URL(request.url).searchParams.get('saved')?.trim() : null;

  if (savedId) {
    const { data, error } = await supabase
      .from('spokedu_master_explanations')
      .select(EXPLANATION_SELECT)
      .eq('owner_id', access.userId)
      .eq('id', savedId)
      .maybeSingle();

    if (error) {
      await reportError(error, {
        context: 'spokedu_master.operational.explanations',
        tags: { method: 'GET', stage: 'saved_select', status: 500 },
      });
      return privateNoStoreJson({ error: EXPLANATION_SERVER_ERROR }, { status: 500 });
    }

    return privateNoStoreJson({
      data: data ? [toExplanationDto(data as MasterExplanationRow)] : [],
      total: data ? 1 : 0,
    });
  }

  const { data, error, count } = await supabase
    .from('spokedu_master_explanations')
    .select(EXPLANATION_SELECT, { count: 'exact' })
    .eq('owner_id', access.userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    await reportError(error, {
      context: 'spokedu_master.operational.explanations',
      tags: { method: 'GET', stage: 'select', status: 500 },
    });
    return privateNoStoreJson({ error: EXPLANATION_SERVER_ERROR }, { status: 500 });
  }

  return privateNoStoreJson({
    data: ((data ?? []) as MasterExplanationRow[]).map(toExplanationDto),
    total: count ?? 0,
  });
}

export async function POST(request: Request) {
  const access = await requireSpokeduMasterAccess();
  if (!access.ok) return withPrivateNoStore(access.response);

  let input;
  try {
    input = normalizeExplanationInput(await request.json());
  } catch (error) {
    return privateNoStoreJson(
      { error: error instanceof Error ? error.message : 'Invalid explanation payload' },
      { status: 400 },
    );
  }

  const supabase = getServiceSupabase();
  const { data: inserted, error: insertError } = await supabase
    .from('spokedu_master_explanations')
    .insert(explanationInsertPayload(input, access.userId))
    .select(EXPLANATION_ID_SELECT)
    .single();

  if (insertError || !inserted) {
    await reportError(insertError ?? new Error('Explanation insert returned no row'), {
      context: 'spokedu_master.operational.explanations',
      tags: { method: 'POST', stage: 'insert', status: 500 },
    });
    return privateNoStoreJson(
      { error: EXPLANATION_SERVER_ERROR },
      { status: 500 },
    );
  }

  const explanationId = (inserted as { id: string }).id;
  const { data, error } = await supabase
    .from('spokedu_master_explanations')
    .select(EXPLANATION_SELECT)
    .eq('owner_id', access.userId)
    .eq('id', explanationId)
    .maybeSingle();

  if (error || !data) {
    await reportError(error ?? new Error('Explanation reload returned no row'), {
      context: 'spokedu_master.operational.explanations',
      tags: { method: 'POST', stage: 'reload', status: 500 },
    });
    return privateNoStoreJson(
      { error: EXPLANATION_SERVER_ERROR },
      { status: 500 },
    );
  }

  return privateNoStoreJson(
    { data: toExplanationDto(data as MasterExplanationRow) },
    { status: 201 },
  );
}
