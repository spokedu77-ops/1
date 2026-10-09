export type BillingOrder = { order_id: string; user_id: string; plan: string; amount: number; status: string; created_at: string; updated_at: string; applied_at: string | null; last_processed_at: string | null; last_error_code: string | null; paymentApproved: boolean };
export type BillingSubscription = { id: string; user_id: string; plan: string; status: string; pg_provider: string | null; toss_order_id: string | null; current_period_end: string | null; next_billing_at: string | null; cancel_at_period_end: boolean; renewal_retry_count: number; last_billing_error: string | null; next_retry_at: string | null };

export function isActualPaidOrder(order: BillingOrder) {
  return order.status === 'active' && order.paymentApproved && Boolean(order.applied_at);
}

export function isActualPaidSubscription(subscription: BillingSubscription, order: BillingOrder | null) {
  return subscription.status === 'active' && subscription.pg_provider !== 'manual_qa' && Boolean(order && isActualPaidOrder(order));
}

export function classifyBillingIssue(order: BillingOrder | null, subscription: BillingSubscription | null, now = Date.now()) {
  if (order?.last_error_code === 'partial_cancel_review_required') return { code: 'partial_cancel_review_required', label: '부분 취소 검토 필요', severity: 'danger' as const };
  if (order?.paymentApproved && (!order.applied_at || order.status === 'recoverable_failed')) return { code: 'approved_apply_failed', label: '승인 후 권한 반영 실패', severity: 'danger' as const };
  if (order?.status === 'processing' && Date.parse(order.last_processed_at ?? order.updated_at) < now - 10 * 60_000) return { code: 'processing_stale', label: '처리 중 장기 지속', severity: 'danger' as const };
  if (subscription?.last_billing_error || subscription?.renewal_retry_count) return { code: 'renewal_failed', label: subscription.next_retry_at ? '갱신 실패 · 재시도 예정' : '갱신 실패', severity: 'danger' as const };
  if (subscription?.cancel_at_period_end) return { code: 'cancel_scheduled', label: '해지 예약', severity: 'warning' as const };
  if (subscription?.pg_provider === 'manual_qa') return { code: 'manual_qa', label: '수동 QA 구독', severity: 'neutral' as const };
  if (order?.status === 'failed') return { code: 'payment_failed', label: '결제 실패', severity: 'danger' as const };
  return { code: 'normal', label: '정상', severity: 'ok' as const };
}

export function paginateBillingRows<T>(rows: T[], page: number, pageSize = 20) {
  const safePage = Math.max(1, page);
  return { rows: rows.slice((safePage - 1) * pageSize, safePage * pageSize), total: rows.length, page: safePage, pageSize };
}
