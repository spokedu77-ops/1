import { applyStaffSessionFees, staffTeacherIds } from '@/app/lib/staffTeacherFees';
import { NextRequest, NextResponse } from 'next/server';

import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { assertSavedSessionRows } from '@/app/admin/classes-shared/lib/sessionSaveVerification';

type SessionScheduleChange = {
  id: string;
  start_at?: string;
  end_at?: string;
  created_by?: string;
  memo?: string | null;
  price?: number;
  expected?: Record<string, unknown>;
};

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: { changes?: SessionScheduleChange[] };
  try {
    body = (await req.json()) as { changes?: SessionScheduleChange[] };
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!Array.isArray(body.changes) || body.changes.length === 0 || body.changes.length > 500) {
    return NextResponse.json({ error: 'invalid_changes' }, { status: 400 });
  }

  const allowed = new Set(['id', 'start_at', 'end_at', 'created_by', 'memo', 'price', 'expected']);
  if (body.changes.some((change) => !change?.id || Object.keys(change).some((key) => !allowed.has(key)))) {
    return NextResponse.json({ error: 'invalid_change_fields' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const assigned = await supabase.from('sessions').select('id,created_by').in('id', body.changes.map((change) => change.id));
  if (assigned.error) return NextResponse.json({ error: 'SESSION_BULK_UPDATE_RELOAD_FAILED' }, { status: 500 });
  const staff = await staffTeacherIds(supabase);
  body.changes = body.changes.map((change) => {
    const teacherId = change.created_by ?? assigned.data?.find((row) => row.id === change.id)?.created_by;
    const { created_by: payableTeacher, ...payableFields } = applyStaffSessionFees({ ...change, created_by: teacherId }, staff);
    return { ...payableFields, ...(change.created_by ? { created_by: payableTeacher } : {}) };
  });
  const checked = body.changes.some((change) => change.expected !== undefined);
  if (checked && body.changes.some((change) => !change.expected)) return NextResponse.json({ error: 'invalid_expected_state' }, { status: 400 });
  const rpcName = checked ? 'admin_apply_session_checked_changes' : 'admin_apply_session_schedule_changes';
  const { data, error } = await supabase.rpc(rpcName, {
    p_changes: body.changes,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  if (data !== body.changes.length) return NextResponse.json({ error: 'SESSION_BULK_UPDATE_UNVERIFIED' }, { status: 409 });
  const stored = await supabase.from('sessions').select('*').in('id', body.changes.map(change => change.id));
  if (stored.error) return NextResponse.json({ error: 'SESSION_BULK_UPDATE_RELOAD_FAILED' }, { status: 500 });
  try {
    assertSavedSessionRows(stored.data, body.changes, 'SESSION_BULK_UPDATE_UNVERIFIED');
  } catch {
    return NextResponse.json({ error: 'SESSION_BULK_UPDATE_UNVERIFIED' }, { status: 409 });
  }

  return NextResponse.json({ ok: true, updated: data });
}
