import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';

const requestSchema = z.discriminatedUnion('operation', [
  z.object({
    operation: z.literal('apply'),
    teacherId: z.string().uuid(),
    pointDelta: z.number().int().safe().refine((value) => value !== 0),
    reason: z.string().trim().min(1).max(500),
    requestKey: z.string().min(16).max(128),
  }),
  z.object({
    operation: z.literal('reverse'),
    teacherId: z.string().uuid(),
    pointDelta: z.number().int().safe().refine((value) => value !== 0),
    logId: z.string().uuid(),
    expectedLogAmount: z.number().int().safe(),
    expectedLogReason: z.string().max(1000),
    requestKey: z.string().min(16).max(128),
  }),
]);

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request', code: 'INVALID_REQUEST' }, { status: 400 });

  const value = parsed.data;
  const reverse = value.operation === 'reverse';
  const { data, error } = await getServiceSupabase().rpc('admin_apply_mileage_adjustment', {
    p_teacher_id: value.teacherId,
    p_point_delta: value.pointDelta,
    p_reason: reverse ? '' : value.reason,
    p_request_key: value.requestKey,
    p_reverse_log_id: reverse ? value.logId : null,
    p_expected_log_amount: reverse ? value.expectedLogAmount : null,
    p_expected_log_reason: reverse ? value.expectedLogReason : null,
  });
  if (error) {
    const known = ['MILEAGE_LOG_STALE', 'MILEAGE_REVERSAL_AMOUNT_MISMATCH', 'MILEAGE_LINKED_LOG_REQUIRES_SESSION_FLOW', 'MILEAGE_TEACHER_NOT_FOUND', 'MILEAGE_IDEMPOTENCY_CONFLICT'];
    const code = known.find((candidate) => error.message.includes(candidate)) ?? 'MILEAGE_ADJUSTMENT_FAILED';
    devLogger.error('[admin/mileage/adjustment]', { code, dbCode: error.code });
    return NextResponse.json({ error: code, code }, { status: code === 'MILEAGE_ADJUSTMENT_FAILED' ? 500 : 409 });
  }
  return NextResponse.json(data);
}
