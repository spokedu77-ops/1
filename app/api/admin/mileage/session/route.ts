import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';

const requestSchema = z.object({
  sessionId: z.string().uuid(),
  expectedAction: z.string().max(500),
  nextAction: z.string().max(500),
  requestKey: z.string().min(16).max(128),
});

function publicError(message: string): { code: string; status: number; error: string } {
  const codes = [
    'MILEAGE_STALE_SESSION',
    'MILEAGE_HISTORICAL_DUPLICATE_CONFLICT',
    'MILEAGE_HISTORICAL_LOG_MISSING',
    'MILEAGE_ACTION_UNKNOWN',
    'MILEAGE_SESSION_NOT_FOUND',
    'MILEAGE_EXTRA_TEACHERS_INVALID',
    'MILEAGE_TEACHER_NOT_FOUND',
    'MILEAGE_IDEMPOTENCY_CONFLICT',
  ];
  const code = codes.find((candidate) => message.includes(candidate)) ?? 'MILEAGE_SETTLEMENT_FAILED';
  const status = code === 'MILEAGE_SESSION_NOT_FOUND' ? 404 : code === 'MILEAGE_SETTLEMENT_FAILED' ? 500 : 409;
  return { code, status, error: code === 'MILEAGE_SETTLEMENT_FAILED' ? '마일리지 정산에 실패했습니다.' : code };
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request', code: 'INVALID_REQUEST' }, { status: 400 });

  const { data, error } = await getServiceSupabase().rpc('admin_apply_session_linked_mileage', {
    p_session_id: parsed.data.sessionId,
    p_next_action: parsed.data.nextAction,
    p_expected_action: parsed.data.expectedAction,
    p_request_key: parsed.data.requestKey,
  });
  if (error) {
    const safe = publicError(error.message);
    devLogger.error('[admin/mileage/session]', { code: safe.code, dbCode: error.code });
    return NextResponse.json({ error: safe.error, code: safe.code }, { status: safe.status });
  }
  return NextResponse.json(data);
}
