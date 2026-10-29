import { NextRequest, NextResponse } from 'next/server';

import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';

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
  const checked = body.changes.some((change) => change.expected !== undefined);
  if (checked && body.changes.some((change) => !change.expected)) return NextResponse.json({ error: 'invalid_expected_state' }, { status: 400 });
  const rpcName = checked ? 'admin_apply_session_checked_changes' : 'admin_apply_session_schedule_changes';
  const { data, error } = await supabase.rpc(rpcName, {
    p_changes: body.changes,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 409 });

  return NextResponse.json({ ok: true, updated: data });
}
