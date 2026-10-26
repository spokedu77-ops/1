import type { RefundRequestRow } from '@/app/admin/spokedu-master-admin/RefundRequestPanel';
import {
  reviewRefundRequest,
  validateRefundApproval,
  type ExistingRefundRequest,
  type RefundRequestStatus,
  type RefundType,
} from './spokeduMasterRefundReview';
import { defaultRefundPgProvider, type RefundPgProvider } from './spokeduMasterRefundPgProvider';

type ServiceSupabase = ReturnType<typeof import('./adminAuth').getServiceSupabase>;

export function isRefundSchemaMissing(error: { code?: string; message?: string } | null | undefined) {
  const code = error?.code ?? '';
  const message = error?.message ?? '';
  return code === '42P01' || code === 'PGRST205' || message.includes('spokedu_master_refund_requests');
}

type RefundRequestRecord = {
  id: string;
  order_id: string;
  user_id: string;
  original_amount: number;
  requested_amount: number;
  refund_type: RefundType;
  reason: string;
  status: RefundRequestStatus;
  pg_evidence_status: 'unverified' | 'verified' | 'unavailable' | 'conflict';
  requested_by: string;
  reviewed_by: string | null;
  approved_by: string | null;
  review_note: string | null;
  idempotency_key: string;
  requested_at: string;
};

type RefundEventRecord = {
  id: string;
  refund_request_id: string;
  event_type: string;
  from_status: string | null;
  to_status: string;
  actor_id: string;
  reason: string | null;
  created_at: string;
};

export type RefundTransitionAction =
  | 'start_review'
  | 'approve'
  | 'reject'
  | 'cancel'
  | 'add_note'
  | 'mark_follow_up'
  | 'complete'
  | 'pg_attempt_failed';

export async function listRefundRequests(
  service: ServiceSupabase,
  input: { page: number; pageSize: number; q: string; status: RefundRequestStatus | 'all' },
) {
  const from = (input.page - 1) * input.pageSize;
  const to = from + input.pageSize - 1;
  let query = service
    .from('spokedu_master_refund_requests')
    .select('*', { count: 'exact' })
    .order('requested_at', { ascending: false })
    .order('id', { ascending: false });

  if (input.status !== 'all') query = query.eq('status', input.status);
  const q = input.q.trim();
  if (q) {
    const escaped = q.replace(/[%_,]/g, '');
    query = query.or(`order_id.ilike.%${escaped}%,reason.ilike.%${escaped}%`);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  const rows = (data ?? []) as RefundRequestRecord[];
  const userIds = [...new Set(rows.flatMap((row) => [row.user_id, row.requested_by, row.reviewed_by, row.approved_by].filter(Boolean) as string[]))];
  const identities = await loadIdentities(service, userIds);
  const requestIds = rows.map((row) => row.id);
  const eventsByRequest = await loadEvents(service, requestIds);

  const mapped = await Promise.all(rows.map(async (row) => {
    const base = mapRefundRow(row, identities, eventsByRequest.get(row.id) ?? []);
    return enrichRefundRowEntitlement(service, base);
  }));

  if (q) {
    const needle = q.toLowerCase();
    const filtered = mapped.filter((row) =>
      row.orderId.toLowerCase().includes(needle)
      || row.reason.toLowerCase().includes(needle)
      || row.customer.email?.toLowerCase().includes(needle)
      || row.customer.name?.toLowerCase().includes(needle));
    return { rows: filtered, total: count ?? filtered.length };
  }

  return { rows: mapped, total: count ?? mapped.length };
}

async function loadEvents(service: ServiceSupabase, requestIds: string[]) {
  const map = new Map<string, RefundEventRecord[]>();
  if (!requestIds.length) return map;
  const { data, error } = await service
    .from('spokedu_master_refund_request_events')
    .select('id,refund_request_id,event_type,from_status,to_status,actor_id,reason,created_at')
    .in('refund_request_id', requestIds)
    .order('created_at', { ascending: true });
  if (error) throw error;
  for (const event of (data ?? []) as RefundEventRecord[]) {
    const list = map.get(event.refund_request_id) ?? [];
    list.push(event);
    map.set(event.refund_request_id, list);
  }
  return map;
}

async function loadIdentities(service: ServiceSupabase, userIds: string[]) {
  const result = new Map<string, { name: string | null; email: string | null }>();
  if (!userIds.length) return result;
  const { data: profiles, error: profileError } = await service
    .from('spokedu_master_profiles')
    .select('user_id,name')
    .in('user_id', userIds);
  if (profileError) throw profileError;
  for (const row of profiles ?? []) {
    result.set(row.user_id, { name: row.name ?? null, email: null });
  }
  for (let page = 1; ; page += 1) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const user of data.users) {
      if (!userIds.includes(user.id)) continue;
      const current = result.get(user.id) ?? { name: null, email: null };
      result.set(user.id, { ...current, email: user.email ?? null });
    }
    if (data.users.length < 1000) break;
  }
  return result;
}

function mapRefundRow(
  row: RefundRequestRecord,
  identities: Map<string, { name: string | null; email: string | null }>,
  events: RefundEventRecord[],
): RefundRequestRow {
  const customer = identities.get(row.user_id) ?? { name: null, email: null };
  return {
    id: row.id,
    requestedAt: row.requested_at,
    customer: { userId: row.user_id, name: customer.name, email: customer.email },
    orderId: row.order_id,
    originalAmount: row.original_amount,
    requestedAmount: row.requested_amount,
    refundType: row.refund_type,
    reason: row.reason,
    status: row.status,
    requester: row.requested_by,
    reviewer: row.reviewed_by,
    reviewNote: row.review_note,
    providerEvidence: row.pg_evidence_status,
    entitlementApplied: false,
    events: events.map((event) => ({
      id: event.id,
      at: event.created_at,
      type: event.event_type,
      actor: event.actor_id,
      from: event.from_status,
      to: event.to_status,
      reason: event.reason,
    })),
  };
}

async function loadOrderContext(service: ServiceSupabase, orderId: string) {
  const { data: order, error: orderError } = await service
    .from('spokedu_master_payment_orders')
    .select('order_id,user_id,amount,status,applied_at,payment_key')
    .eq('order_id', orderId)
    .maybeSingle();
  if (orderError) throw orderError;
  if (!order) return null;

  const [{ data: subscription, error: subError }, { data: existing, error: existingError }] = await Promise.all([
    service.from('spokedu_master_subscriptions').select('user_id,pg_provider').eq('user_id', order.user_id).maybeSingle(),
    service.from('spokedu_master_refund_requests').select('id,order_id,requested_amount,idempotency_key,status').eq('order_id', orderId),
  ]);
  if (subError || existingError) throw subError ?? existingError;

  return {
    order: {
      order_id: order.order_id,
      user_id: order.user_id,
      amount: order.amount,
      status: order.status,
      applied_at: order.applied_at as string | null,
      paymentApproved: Boolean(order.payment_key),
    },
    subscription: subscription ? { user_id: subscription.user_id, pg_provider: subscription.pg_provider as string | null } : null,
    existingRequests: (existing ?? []) as ExistingRefundRequest[],
  };
}

export async function createRefundRequestRecord(
  service: ServiceSupabase,
  input: {
    actorId: string;
    orderId: string;
    userId: string;
    requestedAmount: number;
    refundType: RefundType;
    reason: string;
    idempotencyKey: string;
    pgProvider?: RefundPgProvider;
  },
) {
  const context = await loadOrderContext(service, input.orderId.trim());
  if (!context) return { ok: false as const, status: 404, error: '주문을 찾을 수 없습니다.' };
  if (context.order.user_id !== input.userId) {
    return { ok: false as const, status: 403, error: '주문 소유자와 환불 대상 회원이 일치하지 않습니다.' };
  }

  const provider = input.pgProvider ?? defaultRefundPgProvider;
  const evidence = await provider.lookupEvidence(context.order.order_id);
  const review = reviewRefundRequest({
    order: context.order,
    subscription: context.subscription,
    userId: input.userId,
    requestedAmount: input.requestedAmount,
    refundType: input.refundType,
    idempotencyKey: input.idempotencyKey,
    existingRequests: context.existingRequests,
    provider: evidence,
  });

  if (review.status === 'ineligible' || review.status === 'lookup_error') {
    return { ok: false as const, status: 400, error: review.blockers[0] ?? '환불 요청을 접수할 수 없습니다.', review };
  }
  // hold: PG 잔액 미확정이어도 내부 접수는 허용한다.

  const pgStatus = evidence.state === 'verified' ? 'verified' : evidence.state === 'unavailable' ? 'unavailable' : 'unverified';
  const { data, error } = await service.rpc('spokedu_master_create_refund_request_v1', {
    p_order_id: context.order.order_id,
    p_user_id: input.userId,
    p_requested_amount: input.requestedAmount,
    p_refund_type: input.refundType,
    p_reason: input.reason.trim(),
    p_idempotency_key: input.idempotencyKey.trim(),
    p_requested_by: input.actorId,
    p_pg_evidence_status: pgStatus,
    p_refunded_amount_snapshot: evidence.refundedAmount,
  });

  if (error) {
    if (error.code === '23505') {
      return { ok: false as const, status: 409, error: '동일한 환불 요청이 이미 접수되어 있습니다.' };
    }
    if (error.code === '22023') return { ok: false as const, status: 400, error: error.message };
    if (error.code === 'P0002') return { ok: false as const, status: 404, error: '주문을 찾을 수 없습니다.' };
    throw error;
  }

  return { ok: true as const, id: data as string, review };
}

export async function transitionRefundRequestRecord(
  service: ServiceSupabase,
  input: {
    actorId: string;
    requestId: string;
    action: RefundTransitionAction;
    expectedStatus: RefundRequestStatus;
    reviewNote?: string | null;
    pgProvider?: RefundPgProvider;
  },
) {
  const { data: request, error: readError } = await service
    .from('spokedu_master_refund_requests')
    .select('id,order_id,user_id,status,requested_by,requested_amount')
    .eq('id', input.requestId)
    .maybeSingle();
  if (readError) throw readError;
  if (!request) return { ok: false as const, status: 404, error: '환불 요청을 찾을 수 없습니다.' };
  if (request.status !== input.expectedStatus) {
    return { ok: false as const, status: 409, error: '다른 관리자가 먼저 상태를 변경했습니다.' };
  }

  if (input.action === 'approve') {
    const context = await loadOrderContext(service, request.order_id);
    if (!context) return { ok: false as const, status: 404, error: '주문을 찾을 수 없습니다.' };
    const provider = input.pgProvider ?? defaultRefundPgProvider;
    const evidence = await provider.lookupEvidence(request.order_id);
    const approval = validateRefundApproval({
      requestStatus: request.status as RefundRequestStatus,
      requesterId: request.requested_by,
      approverId: input.actorId,
      approverAuthorized: true,
      orderRevalidated: evidence.state !== 'lookup_error' && Boolean(context.order),
    });
    if (!approval.allowed) {
      return { ok: false as const, status: 400, error: approval.blockers[0] ?? '승인할 수 없습니다.' };
    }
  }

  let providerStatus: string | null = null;
  let providerError: string | null = null;

  if (input.action === 'pg_attempt_failed' || input.action === 'mark_follow_up') {
    const provider = input.pgProvider ?? defaultRefundPgProvider;
    const attempt = await provider.attemptCancellation({
      orderId: request.order_id,
      amount: request.requested_amount,
    });
    providerStatus = attempt.providerStatus;
    providerError = attempt.errorCode;
    if (input.action === 'mark_follow_up' && !attempt.ok) {
      // Record mock PG failure event path is separate; follow_up still allowed for internal workflow.
    }
  }

  const { error } = await service.rpc('spokedu_master_transition_refund_request_v1', {
    p_request_id: input.requestId,
    p_actor_id: input.actorId,
    p_action: input.action,
    p_expected_status: input.expectedStatus,
    p_review_note: input.reviewNote ?? null,
    p_provider_status: providerStatus,
    p_provider_error_code: providerError,
    p_provider_refunded_amount: null,
  });

  if (error) {
    if (error.code === '40001') return { ok: false as const, status: 409, error: '다른 관리자가 먼저 상태를 변경했습니다.' };
    if (error.code === '22023') return { ok: false as const, status: 400, error: error.message };
    if (error.code === 'P0002') return { ok: false as const, status: 404, error: '환불 요청을 찾을 수 없습니다.' };
    throw error;
  }

  return { ok: true as const };
}

export async function enrichRefundRowEntitlement(service: ServiceSupabase, row: RefundRequestRow): Promise<RefundRequestRow> {
  const { data, error } = await service
    .from('spokedu_master_payment_orders')
    .select('applied_at')
    .eq('order_id', row.orderId)
    .maybeSingle();
  if (error) throw error;
  return { ...row, entitlementApplied: Boolean(data?.applied_at) };
}
