import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';

const requestSchema = z.object({
  sessionId: z.string().uuid(),
  expectedMileageOption: z.string().max(500),
  requestKey: z.string().min(16).max(128),
});

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', code: 'INVALID_REQUEST' }, { status: 400 });
  }

  const { data, error } = await getServiceSupabase().rpc('admin_cancel_session_linked_settlement', {
    p_session_id: parsed.data.sessionId,
    p_expected_mileage_option: parsed.data.expectedMileageOption,
    p_request_key: parsed.data.requestKey,
  });

  if (error) {
    const known = [
      'MILEAGE_STALE_SESSION',
      'MILEAGE_SESSION_NOT_FOUND',
      'MILEAGE_ALREADY_CANCELLED',
      'MILEAGE_IDEMPOTENCY_CONFLICT',
      'MILEAGE_CANCEL_INVALID',
    ];
    const code = known.find((candidate) => error.message.includes(candidate)) ?? 'MILEAGE_CANCEL_FAILED';
    devLogger.error('[admin/mileage/cancel-settlement]', { code, dbCode: error.code });
    return NextResponse.json({ error: code, code }, { status: code === 'MILEAGE_CANCEL_FAILED' ? 500 : 409 });
  }

  return NextResponse.json(data);
}
