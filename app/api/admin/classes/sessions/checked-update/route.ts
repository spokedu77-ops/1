import { applyStaffSessionFees, staffTeacherIds } from '@/app/lib/staffTeacherFees';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { jsonMetadataSpan, replaceSessionAssistants, validateSessionAssistants } from '@/app/admin/classes-shared/lib/sessionMetadata';
import { persistedSessionMatches } from '@/app/admin/classes-shared/lib/sessionSaveVerification';
import { assertSessionSchedulePreservesFeedback } from '@/app/lib/server/sessionFeedbackGuard';

const expected = z.object({
  start_at: z.string().datetime({ offset: true }), end_at: z.string().datetime({ offset: true }),
  created_by: z.string().uuid().nullable(), memo: z.string().nullable(), price: z.number().nullable(), status: z.string().nullable(),
}).strict();
const schema = z.object({
  sessionId: z.string().uuid(), expected,
  patch: z.object({ start_at: z.string().datetime({ offset: true }).optional(), end_at: z.string().datetime({ offset: true }).optional(), created_by: z.string().uuid().optional(), price: z.number().int().nonnegative().optional() }).strict().optional(),
  assistants: z.array(z.object({ id: z.string().uuid(), price: z.number().int().nonnegative() }).strict()).max(2).optional(),
}).strict();
const COLUMNS = 'id,group_id,title,start_at,end_at,status,created_by,price,round_index,round_total,sequence_number,session_type,memo,mileage_option';
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'SESSION_UPDATE_INVALID' }, { status: 400 });
  const input = parsed.data;
  if (!input.assistants && !Object.keys(input.patch ?? {}).length) return NextResponse.json({ error: 'SESSION_UPDATE_EMPTY' }, { status: 400 });
  try {
    const patch: Record<string, unknown> = { ...input.patch };
    if (input.assistants) {
      const error = validateSessionAssistants(input.assistants, input.patch?.created_by ?? input.expected.created_by);
      if (error) return NextResponse.json({ error }, { status: 400 });
      patch.memo = replaceSessionAssistants(input.expected.memo, input.assistants);
    }
    if (input.patch?.created_by && !input.assistants) {
      const span = jsonMetadataSpan(input.expected.memo ?? '', 'EXTRA_TEACHERS:');
      const assistants = span ? JSON.parse((input.expected.memo ?? '').slice(span.start, span.end)) : [];
      if (!Array.isArray(assistants)) return NextResponse.json({ error: 'SESSION_METADATA_INVALID' }, { status: 400 });
      const error = validateSessionAssistants(assistants, input.patch.created_by);
      if (error) return NextResponse.json({ error }, { status: 400 });
    }
    const supabase = getServiceSupabase();
    if (input.patch?.start_at) {
      const { data: current, error } = await supabase.from('sessions')
        .select('id,start_at,status,feedback_fields,students_text,photo_url,file_url')
        .eq('id', input.sessionId).maybeSingle();
      if (error) return NextResponse.json({ error: 'SESSION_UPDATE_LOOKUP_FAILED' }, { status: 500 });
      if (!current) return NextResponse.json({ error: 'SESSION_NOT_FOUND' }, { status: 404 });
      assertSessionSchedulePreservesFeedback(current, input.patch.start_at);
    }
    const teacherIds = [...new Set([...(input.assistants ?? []).map((teacher) => teacher.id), ...(input.patch?.created_by ? [input.patch.created_by] : [])])];
    if (teacherIds.length) {
      const teachers = await supabase.from('users').select('id').in('id', teacherIds);
      if (teachers.error) return NextResponse.json({ error: 'SESSION_UPDATE_FAILED' }, { status: 500 });
      if (teachers.data?.length !== teacherIds.length) return NextResponse.json({ error: 'SESSION_TEACHER_NOT_FOUND' }, { status: 400 });
    }
    const payable = applyStaffSessionFees({ ...patch, created_by: input.patch?.created_by ?? input.expected.created_by }, await staffTeacherIds(supabase));
    const { created_by: payableTeacher, ...payableFields } = payable;
    Object.assign(patch, payableFields, input.patch?.created_by ? { created_by: payableTeacher } : {});
    // One conditional UPDATE: Postgres rechecks the predicate after waiting for a row lock.
    let update = supabase.from('sessions').update(patch).eq('id', input.sessionId);
    for (const [key, value] of Object.entries(input.expected)) {
      update = value === null ? update.is(key, null) : update.eq(key, value);
    }
    const { data, error } = await update.select(COLUMNS).maybeSingle();
    if (error) {
      console.warn('checked session update rejected', { sessionId: input.sessionId, code: error.code, reason: error.message });
      if (error.message.includes('SESSION_COUNT_EXTRA_TEACHERS_INVALID')) {
        return NextResponse.json({ error: 'SESSION_UPDATE_METADATA_INVALID', message: '기존 보조강사 정보 오류로 저장하지 못했습니다. 배정은 변경되지 않았습니다.' }, { status: 422 });
      }
      if (error.message.includes('SESSION_COUNT_')) {
        return NextResponse.json({ error: 'SESSION_UPDATE_COUNT_CONFLICT', message: '수업 배정과 연동 회차 기록이 일치하지 않아 저장을 중단했습니다. 입력 내용은 유지했습니다.' }, { status: 409 });
      }
      const conflict = error.message.includes('TEACHER_SCHEDULE_CONFLICT') || error.code === '23P01';
      return NextResponse.json({ error: conflict ? 'TEACHER_SCHEDULE_CONFLICT' : error.code === '42501' ? 'SESSION_UPDATE_FORBIDDEN' : 'SESSION_UPDATE_FAILED' }, { status: conflict ? 409 : error.code === '42501' ? 403 : 500 });
    }
    if (!data) return NextResponse.json({ error: 'SESSION_UPDATE_STALE' }, { status: 409 });
    if (!persistedSessionMatches(data, { id: input.sessionId, ...input.expected, ...patch })) {
      return NextResponse.json({ error: 'SESSION_UPDATE_UNVERIFIED', message: '요청한 변경과 DB 저장 결과가 일치하지 않습니다. 다시 조회해 실제 반영 내용을 확인해 주세요.' }, { status: 409 });
    }
    // Return the actual stored row (including trigger results), never the submitted patch.
    return NextResponse.json({ ok: true, session: data });
  } catch (error) {
    if (error instanceof Error && error.message === 'SESSION_RECORDED_SCHEDULE_MOVE_FORBIDDEN') {
      return NextResponse.json({ error: error.message, message: '완료 기록이나 피드백이 있는 수업을 오늘·미래 날짜로 옮길 수 없습니다. 기존 기록을 보존하고 새 수업을 생성해 주세요.' }, { status: 409 });
    }
    console.warn('checked session update unavailable', { sessionId: input.sessionId, error: error instanceof Error ? error.name : 'unknown' });
    const metadata = error instanceof SyntaxError || (error instanceof Error && error.message.startsWith('SESSION_METADATA_'));
    return NextResponse.json({ error: metadata ? 'SESSION_METADATA_INVALID' : 'SESSION_UPDATE_FAILED' }, { status: metadata ? 400 : 500 });
  }
}
