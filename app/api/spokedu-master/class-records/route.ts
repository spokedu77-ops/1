import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { privateNoStoreJson, withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { requireSpokeduMasterAccess } from '@/app/lib/server/spokeduMasterAccess';
import {
  classRecordInsertPayload,
  classRecordStudentInsertPayload,
  normalizeClassRecordInput,
  toClassRecordDto,
  type MasterClassRecordRow,
} from '../operational-data';

const RECORD_SELECT = `
  id,
  owner_id,
  legacy_id,
  class_date,
  lesson_title,
  class_id,
  program_id,
  program_title,
  record_type,
  memo,
  parent_note_snapshot,
  created_at,
  updated_at,
  deleted_at,
  spokedu_master_class_record_students (
    id,
    owner_id,
    record_id,
    student_id,
    student_legacy_id,
    student_name_snapshot,
    attendance,
    focused,
    skills,
    memo,
    created_at,
    updated_at
  )
`;

const STUDENT_ID_SELECT = 'id';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const access = await requireSpokeduMasterAccess();
  if (!access.ok) return withPrivateNoStore(access.response);

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('spokedu_master_class_records')
    .select(RECORD_SELECT)
    .eq('owner_id', access.userId)
    .is('deleted_at', null)
    .order('class_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    return privateNoStoreJson({ error: error.message }, { status: 500 });
  }

  return privateNoStoreJson({
    data: ((data ?? []) as MasterClassRecordRow[]).map(toClassRecordDto),
  });
}

async function resolveOwnedStudentIds(
  supabase: ReturnType<typeof getServiceSupabase>,
  ownerId: string,
  studentIds: string[],
) {
  const uniqueIds = Array.from(new Set(studentIds.filter(Boolean)));
  if (uniqueIds.length === 0) return new Set<string>();

  const { data, error } = await supabase
    .from('spokedu_master_students')
    .select(STUDENT_ID_SELECT)
    .eq('owner_id', ownerId)
    .is('deleted_at', null)
    .in('id', uniqueIds);

  if (error) throw new Error(error.message);
  return new Set(((data ?? []) as Array<{ id: string }>).map((row) => row.id));
}

export async function POST(request: Request) {
  const access = await requireSpokeduMasterAccess();
  if (!access.ok) return withPrivateNoStore(access.response);

  let input;
  try {
    input = normalizeClassRecordInput(await request.json());
  } catch (error) {
    return privateNoStoreJson(
      { error: error instanceof Error ? error.message : 'Invalid class record payload' },
      { status: 400 },
    );
  }

  const supabase = getServiceSupabase();

  if (input.legacyId) {
    const { data: existing, error: existingError } = await supabase
      .from('spokedu_master_class_records')
      .select(RECORD_SELECT)
      .eq('owner_id', access.userId)
      .eq('legacy_id', input.legacyId)
      .is('deleted_at', null)
      .maybeSingle();

    if (existingError) {
      return privateNoStoreJson({ error: existingError.message }, { status: 500 });
    }

    if (existing) {
      return privateNoStoreJson({
        data: toClassRecordDto(existing as MasterClassRecordRow),
        duplicate: true,
      });
    }
  }

  let ownedStudentIds: Set<string>;
  try {
    ownedStudentIds = await resolveOwnedStudentIds(
      supabase,
      access.userId,
      input.students.map((student) => student.studentId).filter((id): id is string => Boolean(id)),
    );
  } catch (error) {
    return privateNoStoreJson(
      { error: error instanceof Error ? error.message : 'Student lookup failed' },
      { status: 500 },
    );
  }

  const invalidStudent = input.students.find(
    (student) => student.studentId && !ownedStudentIds.has(student.studentId),
  );
  if (invalidStudent) {
    return privateNoStoreJson({ error: 'studentId is not available for this owner' }, { status: 400 });
  }

  const { data: inserted, error: insertError } = await supabase
    .from('spokedu_master_class_records')
    .insert(classRecordInsertPayload(input, access.userId))
    .select('id')
    .single();

  if (insertError || !inserted) {
    return privateNoStoreJson({ error: insertError?.message ?? 'Record insert failed' }, { status: 500 });
  }

  const recordId = (inserted as { id: string }).id;
  const childRows = input.students.map((student) =>
    classRecordStudentInsertPayload(student, access.userId, recordId, student.studentId),
  );

  if (childRows.length > 0) {
    const { error: childError } = await supabase
      .from('spokedu_master_class_record_students')
      .insert(childRows);

    if (childError) {
      await supabase
        .from('spokedu_master_class_records')
        .delete()
        .eq('owner_id', access.userId)
        .eq('id', recordId);

      return privateNoStoreJson(
        { error: childError.message, partialSave: false, rolledBack: true },
        { status: 500 },
      );
    }
  }

  const { data, error } = await supabase
    .from('spokedu_master_class_records')
    .select(RECORD_SELECT)
    .eq('owner_id', access.userId)
    .eq('id', recordId)
    .maybeSingle();

  if (error || !data) {
    return privateNoStoreJson({ error: error?.message ?? 'Record reload failed' }, { status: 500 });
  }

  return privateNoStoreJson(
    { data: toClassRecordDto(data as MasterClassRecordRow), duplicate: false },
    { status: 201 },
  );
}
