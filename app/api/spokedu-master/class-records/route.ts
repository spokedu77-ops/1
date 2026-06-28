import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { privateNoStoreJson, withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { requireSpokeduMasterAccess } from '@/app/lib/server/spokeduMasterAccess';
import { reportError } from '@/app/lib/monitoring/errorReporter';
import {
  classRecordCreateRpcPayload,
  classRecordReplaceRpcPayload,
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

const CLASS_RECORD_SERVER_ERROR = '수업 기록을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';

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
    await reportError(error, {
      context: 'spokedu_master.operational.class_records',
      tags: { method: 'GET', stage: 'select', status: 500 },
    });
    return privateNoStoreJson({ error: CLASS_RECORD_SERVER_ERROR }, { status: 500 });
  }

  return privateNoStoreJson({
    data: ((data ?? []) as MasterClassRecordRow[]).map(toClassRecordDto),
  });
}

type ClassRecordCreateRpcRow = {
  record_id: string;
  created: boolean;
};

function firstCreateRpcRow(data: unknown): ClassRecordCreateRpcRow | null {
  if (Array.isArray(data)) return (data[0] as ClassRecordCreateRpcRow | undefined) ?? null;
  if (data && typeof data === 'object') return data as ClassRecordCreateRpcRow;
  return null;
}

function isExpectedClassRecordInputError(code: string | undefined) {
  return code === '22023' || code === '22P02' || code === '23514';
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

  const { data: createData, error: createError } = await supabase.rpc(
    'spokedu_master_create_class_record',
    classRecordCreateRpcPayload(input, access.userId),
  );
  const createdRecord = firstCreateRpcRow(createData);

  if (createError || !createdRecord?.record_id) {
    if (isExpectedClassRecordInputError(createError?.code)) {
      return privateNoStoreJson(
        { error: createError?.code === '23514' ? 'Invalid class record payload' : 'studentId is not available for this owner' },
        { status: 400 },
      );
    }
    await reportError(createError ?? new Error('Class record create RPC returned no record id'), {
      context: 'spokedu_master.operational.class_records',
      tags: { method: 'POST', stage: 'create_transaction', status: 500 },
    });
    return privateNoStoreJson({ error: CLASS_RECORD_SERVER_ERROR }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('spokedu_master_class_records')
    .select(RECORD_SELECT)
    .eq('owner_id', access.userId)
    .eq('id', createdRecord.record_id)
    .maybeSingle();

  if (error || !data) {
    await reportError(error ?? new Error('Record reload returned no row'), {
      context: 'spokedu_master.operational.class_records',
      tags: { method: 'POST', stage: 'reload', status: 500 },
    });
    return privateNoStoreJson({ error: 'Record reload failed' }, { status: 500 });
  }

  return privateNoStoreJson(
    { data: toClassRecordDto(data as MasterClassRecordRow), duplicate: !createdRecord.created },
    { status: createdRecord.created ? 201 : 200 },
  );
}

export async function PATCH(request: Request) {
  const access = await requireSpokeduMasterAccess();
  if (!access.ok) return withPrivateNoStore(access.response);

  const recordId = new URL(request.url).searchParams.get('id')?.trim();
  if (!recordId) {
    return privateNoStoreJson({ error: 'record id is required' }, { status: 400 });
  }

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
  const { error: replaceError } = await supabase.rpc(
    'spokedu_master_replace_class_record',
    classRecordReplaceRpcPayload(input, access.userId, recordId),
  );

  if (replaceError) {
    if (replaceError.code === 'P0002') {
      return privateNoStoreJson({ error: 'Record not found' }, { status: 404 });
    }
    if (replaceError.code === '22023') {
      return privateNoStoreJson(
        { error: 'studentId is not available for this owner' },
        { status: 400 },
      );
    }
    if (replaceError.code === '22P02') {
      return privateNoStoreJson({ error: 'Invalid class record payload' }, { status: 400 });
    }
    await reportError(replaceError, {
      context: 'spokedu_master.operational.class_records',
      tags: { method: 'PATCH', stage: 'replace_transaction', status: 500 },
    });
    return privateNoStoreJson({ error: 'Record update failed' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('spokedu_master_class_records')
    .select(RECORD_SELECT)
    .eq('owner_id', access.userId)
    .eq('id', recordId)
    .maybeSingle();

  if (error || !data) {
    await reportError(error ?? new Error('Record reload returned no row'), {
      context: 'spokedu_master.operational.class_records',
      tags: { method: 'PATCH', stage: 'reload', status: 500 },
    });
    return privateNoStoreJson({ error: CLASS_RECORD_SERVER_ERROR }, { status: 500 });
  }

  return privateNoStoreJson({ data: toClassRecordDto(data as MasterClassRecordRow) });
}
