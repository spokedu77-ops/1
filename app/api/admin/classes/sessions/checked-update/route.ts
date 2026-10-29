import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { jsonMetadataSpan, replaceSessionAssistants, validateSessionAssistants } from '@/app/admin/classes-shared/lib/sessionMetadata';

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
    const teacherIds = [...new Set([...(input.assistants ?? []).map((teacher) => teacher.id), ...(input.patch?.created_by ? [input.patch.created_by] : [])])];
    if (teacherIds.length) {
      const teachers = await supabase.from('users').select('id').in('id', teacherIds);
      if (teachers.error) return NextResponse.json({ error: 'SESSION_UPDATE_FAILED' }, { status: 500 });
      if (teachers.data?.length !== teacherIds.length) return NextResponse.json({ error: 'SESSION_TEACHER_NOT_FOUND' }, { status: 400 });
    }
    // One conditional UPDATE: Postgres rechecks the predicate after waiting for a row lock.
    let update = supabase.from('sessions').update(patch).eq('id', input.sessionId);
    for (const [key, value] of Object.entries(input.expected)) {
      update = value === null ? update.is(key, null) : update.eq(key, value);
    }
    const { data, error } = await update.select(COLUMNS).maybeSingle();
    if (error) {
      const conflict = error.message.includes('TEACHER_SCHEDULE_CONFLICT') || error.code === '23P01';
      return NextResponse.json({ error: conflict ? 'TEACHER_SCHEDULE_CONFLICT' : error.code === '42501' ? 'SESSION_UPDATE_FORBIDDEN' : 'SESSION_UPDATE_FAILED' }, { status: conflict ? 409 : error.code === '42501' ? 403 : 500 });
    }
    if (!data) return NextResponse.json({ error: 'SESSION_UPDATE_STALE' }, { status: 409 });
    // Return the actual stored row (including trigger results), never the submitted patch.
    return NextResponse.json({ ok: true, session: data });
  } catch (error) {
    const metadata = error instanceof SyntaxError || (error instanceof Error && error.message.startsWith('SESSION_METADATA_'));
    return NextResponse.json({ error: metadata ? 'SESSION_METADATA_INVALID' : 'SESSION_UPDATE_FAILED' }, { status: metadata ? 400 : 500 });
  }
}
