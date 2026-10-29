import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { devLogger } from '@/app/lib/logging/devLogger';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';

const requestSchema = z.object({
  sessionId: z.string().uuid(),
  mode: z.enum(['postpone', 'postpone_request', 'undo']),
  expectedStartAt: z.string().datetime({ offset: true }),
  requestKey: z.string().uuid(),
});

const PUBLIC_CODES = [
  'POSTPONE_SESSION_NOT_FOUND',
  'POSTPONE_GROUP_REQUIRED',
  'POSTPONE_STALE_SESSION',
  'POSTPONE_INVALID_STATUS',
  'POSTPONE_NO_ACTIVE_SESSION',
  'POSTPONE_DUPLICATE_SLOT',
  'POSTPONE_CROSS_GROUP_CONFLICT',
  'POSTPONE_IDEMPOTENCY_CONFLICT',
  'POSTPONE_LEGACY_MILEAGE_REVIEW_REQUIRED',
  'POSTPONE_SNAPSHOT_CONFLICT',
  'POSTPONE_SNAPSHOT_MISSING',
  'POSTPONE_SNAPSHOT_INVALID',
  'POSTPONE_SNAPSHOT_REVIEW_REQUIRED',
  'POSTPONE_WEEKDAY_TEMPLATE_AMBIGUOUS',
  'POSTPONE_DESTINATION_SLOT_AMBIGUOUS',
  'POSTPONE_EXTRA_TEACHERS_INVALID',
  'POSTPONE_MAIN_ASSIST_TEACHER_CONFLICT',
  'POSTPONE_RESTORE_STATE_CHANGED',
  'POSTPONE_SESSION_COUNT_MANUAL_CONFLICT',
  'POSTPONE_SETTLED_SESSION_CONFLICT',
  'MILEAGE_HISTORICAL_DUPLICATE_CONFLICT',
  'MILEAGE_HISTORICAL_LOG_MISSING',
  'MILEAGE_HISTORICAL_ADJUSTMENT_CONFLICT',
  'MILEAGE_HISTORICAL_AMOUNT_CONFLICT',
  'MILEAGE_ACTION_UNKNOWN',
  'MILEAGE_EXTRA_TEACHERS_INVALID',
  'MILEAGE_TEACHER_NOT_FOUND',
] as const;

function publicError(message: string) {
  const code = PUBLIC_CODES.find((candidate) => message.includes(candidate)) ?? 'POSTPONE_TRANSACTION_FAILED';
  const status = code === 'POSTPONE_SESSION_NOT_FOUND' ? 404 : code === 'POSTPONE_TRANSACTION_FAILED' ? 500 : 409;
  return { code, status };
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', code: 'INVALID_REQUEST' }, { status: 400 });
  }

  const { data, error } = await getServiceSupabase().rpc('admin_apply_class_postpone', {
    p_session_id: parsed.data.sessionId,
    p_mode: parsed.data.mode,
    p_expected_start_at: parsed.data.expectedStartAt,
    p_request_key: parsed.data.requestKey,
  });
  if (error) {
    const safe = publicError(error.message);
    devLogger.error('[admin/classes/postpone]', { code: safe.code, dbCode: error.code });
    return NextResponse.json({ error: safe.code, code: safe.code }, { status: safe.status });
  }
  return NextResponse.json(data);
}
