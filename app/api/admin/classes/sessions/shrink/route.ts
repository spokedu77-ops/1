import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';

const expected = z.object({
  id: z.string().uuid(), start_at: z.string().datetime({ offset: true }), end_at: z.string().datetime({ offset: true }),
  created_by: z.string().uuid().nullable(), memo: z.string().nullable(), price: z.number().nullable(), status: z.string().nullable(),
  round_index: z.number().int().nullable(), round_total: z.number().int().nullable(),
}).strict();
const schema = z.object({
  groupId: z.string().uuid(), expected: z.array(expected).min(1).max(1000), removeIds: z.array(z.string().uuid()).min(1).max(1000),
  roundUpdates: z.array(z.object({ id: z.string().uuid(), round_total: z.number().int().positive(), round_index: z.number().int().positive().optional(), sequence_number: z.number().int().positive().optional(), round_display: z.string().optional() }).strict()).max(1000),
}).strict();
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'SESSION_SHRINK_INVALID' }, { status: 400 });
  const input = parsed.data;
  const { data, error } = await getServiceSupabase().rpc('admin_apply_session_tail_shrink', {
    p_group_id: input.groupId, p_expected: input.expected, p_remove_ids: input.removeIds, p_round_updates: input.roundUpdates,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  if (data !== input.removeIds.length) return NextResponse.json({ error: 'SESSION_SHRINK_UNVERIFIED' }, { status: 409 });
  return NextResponse.json({ ok: true, deleted: data });
}
