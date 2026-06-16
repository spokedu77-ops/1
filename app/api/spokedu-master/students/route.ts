import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { requireSpokeduMasterAccess } from '@/app/lib/server/spokeduMasterAccess';
import {
  normalizeStudentInput,
  studentInsertPayload,
  toStudentDto,
  type MasterStudentRow,
} from '../operational-data';

const STUDENT_SELECT = 'id,owner_id,legacy_id,name,group_name,meta,created_at,updated_at,deleted_at';

export async function GET() {
  const access = await requireSpokeduMasterAccess();
  if (!access.ok) return access.response;

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('spokedu_master_students')
    .select(STUDENT_SELECT)
    .eq('owner_id', access.userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: ((data ?? []) as MasterStudentRow[]).map(toStudentDto),
  });
}

export async function POST(request: Request) {
  const access = await requireSpokeduMasterAccess();
  if (!access.ok) return access.response;

  let input;
  try {
    input = normalizeStudentInput(await request.json());
  } catch (error) {
    return NextResponse.json(
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
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { data: toStudentDto(data as MasterStudentRow), duplicate: false },
    { status: 201 },
  );
}
