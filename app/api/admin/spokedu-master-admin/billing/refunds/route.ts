import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import type { RefundRequestStatus } from '@/app/lib/server/spokeduMasterRefundReview';
import {
  createRefundRequestRecord,
  isRefundSchemaMissing,
  listRefundRequests,
  transitionRefundRequestRecord,
  type RefundTransitionAction,
} from '@/app/lib/server/spokeduMasterRefundWorkflow';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

function parseStatus(value: string | null): RefundRequestStatus | 'all' {
  const allowed: Array<RefundRequestStatus | 'all'> = [
    'all', 'received', 'under_review', 'approved', 'rejected', 'follow_up_pending', 'completed', 'cancelled',
  ];
  return (allowed.includes(value as RefundRequestStatus | 'all') ? value : 'all') as RefundRequestStatus | 'all';
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return withPrivateNoStore(auth.response);

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1) || 1);
  const q = (url.searchParams.get('q') ?? '').trim();
  const status = parseStatus(url.searchParams.get('status'));

  try {
    const service = getServiceSupabase();
    const { rows, total } = await listRefundRequests(service, { page, pageSize: PAGE_SIZE, q, status });
    return withPrivateNoStore(NextResponse.json({ availability: 'available', rows, total, page, pageSize: PAGE_SIZE }));
  } catch (error) {
    if (isRefundSchemaMissing(error as { code?: string; message?: string })) {
      return withPrivateNoStore(NextResponse.json({ availability: 'schema_pending', rows: [], total: 0, page, pageSize: PAGE_SIZE }));
    }
    return withPrivateNoStore(NextResponse.json({ availability: 'error', error: '환불 요청을 불러오지 못했습니다.' }, { status: 500 }));
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return withPrivateNoStore(auth.response);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return withPrivateNoStore(NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }));
  }

  const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
  const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey.trim() : '';
  const refundType = body.refundType === 'partial' ? 'partial' : 'full';
  const requestedAmount = Number(body.requestedAmount);

  if (!orderId || !userId || !reason || !idempotencyKey || !Number.isInteger(requestedAmount) || requestedAmount <= 0) {
    return withPrivateNoStore(NextResponse.json({ error: 'orderId, userId, requestedAmount, reason, idempotencyKey가 필요합니다.' }, { status: 400 }));
  }

  try {
    const service = getServiceSupabase();
    const result = await createRefundRequestRecord(service, {
      actorId: auth.userId,
      orderId,
      userId,
      requestedAmount,
      refundType,
      reason,
      idempotencyKey,
    });
    if (!result.ok) {
      return withPrivateNoStore(NextResponse.json({ error: result.error, review: 'review' in result ? result.review : undefined }, { status: result.status }));
    }
    return withPrivateNoStore(NextResponse.json({ id: result.id, review: result.review }, { status: 201 }));
  } catch (error) {
    if (isRefundSchemaMissing(error as { code?: string; message?: string })) {
      return withPrivateNoStore(NextResponse.json({ error: '환불 요청 스키마가 아직 적용되지 않았습니다.' }, { status: 503 }));
    }
    return withPrivateNoStore(NextResponse.json({ error: '환불 요청 접수에 실패했습니다.' }, { status: 500 }));
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return withPrivateNoStore(auth.response);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return withPrivateNoStore(NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }));
  }

  const requestId = typeof body.requestId === 'string' ? body.requestId.trim() : '';
  const actionRaw = typeof body.action === 'string' ? body.action.trim() : '';
  const expectedStatus = typeof body.expectedStatus === 'string' ? body.expectedStatus.trim() as RefundRequestStatus : null;
  const reviewNote = typeof body.reviewNote === 'string' ? body.reviewNote : null;

  const allowedActions: RefundTransitionAction[] = [
    'start_review', 'approve', 'reject', 'cancel', 'add_note', 'mark_follow_up', 'complete', 'pg_attempt_failed',
  ];

  if (!requestId || !expectedStatus || !allowedActions.includes(actionRaw as RefundTransitionAction)) {
    return withPrivateNoStore(NextResponse.json({ error: 'requestId, expectedStatus, action이 필요합니다.' }, { status: 400 }));
  }

  try {
    const service = getServiceSupabase();
    const result = await transitionRefundRequestRecord(service, {
      actorId: auth.userId,
      requestId,
      action: actionRaw as RefundTransitionAction,
      expectedStatus,
      reviewNote,
    });
    if (!result.ok) {
      return withPrivateNoStore(NextResponse.json({ error: result.error }, { status: result.status }));
    }
    return withPrivateNoStore(NextResponse.json({ ok: true }));
  } catch (error) {
    if (isRefundSchemaMissing(error as { code?: string; message?: string })) {
      return withPrivateNoStore(NextResponse.json({ error: '환불 요청 스키마가 아직 적용되지 않았습니다.' }, { status: 503 }));
    }
    return withPrivateNoStore(NextResponse.json({ error: '환불 요청 상태 변경에 실패했습니다.' }, { status: 500 }));
  }
}
