import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { privateNoStoreJson, withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { requireSpokeduMasterAccess } from '@/app/lib/server/spokeduMasterAccess';
import {
  normalizeStudentInput,
  studentInsertPayload,
  toStudentDto,
  type MasterStudentRow,
} from '../operational-data';

const STUDENT_SELECT = 'id,owner_id,legacy_id,name,group_name,meta,created_at,updated_at,deleted_at';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const access = await requireSpokeduMasterAccess();
  if (!access.ok) return withPrivateNoStore(access.response);

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('spokedu_master_students')
    .select(STUDENT_SELECT)
    .eq('owner_id', access.userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    return privateNoStoreJson({ error: error.message }, { status: 500 });
  }

  return privateNoStoreJson({
    data: ((data ?? []) as MasterStudentRow[]).map(toStudentDto),
  });
}

export async function POST(request: Request) {
  const access = await requireSpokeduMasterAccess();
  if (!access.ok) return withPrivateNoStore(access.response);

  let input;
  try {
    input = normalizeStudentInput(await request.json());
  } catch (error) {
    return privateNoStoreJson(
      { error: error instanceof Error ? error.message : 'Invalid student payload' },
      { status: 400 },
    );
  }

  const supabase = getServiceSupabase();

  if (input.legacyId) {
    const { data: existing, error: existingError } = await supabase
      .from('spokedu_master_students')
      .select(STUDENT_SELECT)
      .eq('owner_id', access.userId)
      .eq('legacy_id', input.legacyId)
      .is('deleted_at', null)
      .maybeSingle();

    if (existingError) {
      return privateNoStoreJson({ error: existingError.message }, { status: 500 });
    }

    if (existing) {
      return privateNoStoreJson({
        data: toStudentDto(existing as MasterStudentRow),
        duplicate: true,
      });
    }
  }

  const { data, error } = await supabase
    .from('spokedu_master_students')
    .insert(studentInsertPayload(input, access.userId))
    .select(STUDENT_SELECT)
    .single();

  if (error) {
    return privateNoStoreJson({ error: error.message }, { status: 500 });
  }

  return privateNoStoreJson(
    { data: toStudentDto(data as MasterStudentRow), duplicate: false },
    { status: 201 },
  );
}
