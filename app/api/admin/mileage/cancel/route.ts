import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';

const requestSchema = z.object({
  teacherId: z.string().uuid(),
  logId: z.string().uuid(),
  expectedLogAmount: z.number().int().safe(),
  expectedLogReason: z.string().max(1000),
  requestKey: z.string().min(16).max(128),
});

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', code: 'INVALID_REQUEST' }, { status: 400 });
  }

  const { data, error } = await getServiceSupabase().rpc('admin_cancel_mileage_log', {
    p_teacher_id: parsed.data.teacherId,
    p_log_id: parsed.data.logId,
    p_expected_log_amount: parsed.data.expectedLogAmount,
    p_expected_log_reason: parsed.data.expectedLogReason,
    p_request_key: parsed.data.requestKey,
  });

  if (error) {
    const known = [
      'MILEAGE_LOG_STALE',
      'MILEAGE_TEACHER_NOT_FOUND',
      'MILEAGE_SESSION_NOT_FOUND',
      'MILEAGE_ALREADY_CANCELLED',
      'MILEAGE_IDEMPOTENCY_CONFLICT',
      'MILEAGE_CANCEL_INVALID',
    ];
    const code = known.find((candidate) => error.message.includes(candidate)) ?? 'MILEAGE_CANCEL_FAILED';
    devLogger.error('[admin/mileage/cancel]', { code, dbCode: error.code });
    return NextResponse.json({ error: code, code }, { status: code === 'MILEAGE_CANCEL_FAILED' ? 500 : 409 });
  }

  return NextResponse.json(data);
}
