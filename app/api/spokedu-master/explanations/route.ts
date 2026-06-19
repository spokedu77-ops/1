import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { privateNoStoreJson, withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { requireSpokeduMasterAccess } from '@/app/lib/server/spokeduMasterAccess';
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

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const access = await requireSpokeduMasterAccess();
  if (!access.ok) return withPrivateNoStore(access.response);

  const supabase = getServiceSupabase();
  const { data, error, count } = await supabase
    .from('spokedu_master_explanations')
    .select(EXPLANATION_SELECT, { count: 'exact' })
    .eq('owner_id', access.userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    return privateNoStoreJson({ error: error.message }, { status: 500 });
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
    return privateNoStoreJson(
      { error: insertError?.message ?? 'Explanation insert failed' },
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
    return privateNoStoreJson(
      { error: error?.message ?? 'Explanation reload failed' },
      { status: 500 },
    );
  }

  return privateNoStoreJson(
    { data: toExplanationDto(data as MasterExplanationRow) },
    { status: 201 },
  );
}
