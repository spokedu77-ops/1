export type RefundRequestStatus = 'received' | 'under_review' | 'approved' | 'rejected' | 'follow_up_pending' | 'completed' | 'cancelled';
export type RefundType = 'full' | 'partial';
export type RefundReviewStatus = 'eligible' | 'hold' | 'ineligible' | 'lookup_error';

export type RefundReviewOrder = {
  order_id: string;
  user_id: string;
  amount: number;
  status: string;
  applied_at: string | null;
  paymentApproved: boolean;
};

export type RefundReviewSubscription = {
  user_id: string;
  pg_provider: string | null;
} | null;

export type ExistingRefundRequest = {
  id: string;
  order_id: string;
  requested_amount: number;
  idempotency_key: string;
  status: RefundRequestStatus;
};

export type RefundProviderEvidence = {
  state: 'verified' | 'unverified' | 'unavailable' | 'lookup_error';
  refundedAmount: number | null;
  cancellation: 'none' | 'partial' | 'full' | 'unknown';
};

export type RefundReviewResult = {
  status: RefundReviewStatus;
  eligibleForInternalReview: boolean;
  refundableAmount: number | null;
  entitlementApplied: boolean;
  blockers: string[];
  warnings: string[];
  evidence: string[];
};

const OPEN_STATUSES = new Set<RefundRequestStatus>(['received', 'under_review', 'approved', 'follow_up_pending']);

export function reviewRefundRequest(input: {
  order: RefundReviewOrder | null;
  subscription: RefundReviewSubscription;
  userId: string;
  requestedAmount: number;
  refundType: RefundType;
  idempotencyKey: string;
  existingRequests: ExistingRefundRequest[];
  provider: RefundProviderEvidence;
}): RefundReviewResult {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const evidence: string[] = [];
  const order = input.order;

  if (input.provider.state === 'lookup_error') return {
    status: 'lookup_error', eligibleForInternalReview: false, refundableAmount: null,
    entitlementApplied: Boolean(order?.applied_at), blockers: ['PG 취소·환불 근거를 조회하지 못했습니다.'], warnings, evidence,
  };
  if (!order) blockers.push('원본 주문이 존재하지 않습니다.');
  if (order && order.user_id !== input.userId) blockers.push('주문 소유자와 환불 대상 회원이 일치하지 않습니다.');
  if (input.subscription?.pg_provider === 'manual_qa') blockers.push('manual_qa 구독은 실제 환불 요청 대상이 아닙니다.');
  if (order && !order.paymentApproved) blockers.push('실제 승인된 결제 근거가 없습니다.');
  if (!Number.isInteger(input.requestedAmount) || input.requestedAmount <= 0) blockers.push('환불 요청 금액은 양의 정수여야 합니다.');
  if (order && input.requestedAmount > order.amount) blockers.push('환불 요청 금액이 원결제 금액을 초과합니다.');
  if (order && input.refundType === 'full' && input.requestedAmount !== order.amount) blockers.push('전액 환불 요청 금액이 원결제 금액과 일치하지 않습니다.');
  if (!input.idempotencyKey.trim()) blockers.push('중복 요청 방지 키가 필요합니다.');

  const activeRequests = input.existingRequests.filter((request) => request.order_id === order?.order_id && OPEN_STATUSES.has(request.status));
  if (activeRequests.some((request) => request.idempotency_key === input.idempotencyKey)) blockers.push('동일한 환불 요청이 이미 접수되어 있습니다.');
  if (activeRequests.some((request) => request.requested_amount === input.requestedAmount)) blockers.push('같은 주문과 금액의 미완료 환불 요청이 이미 존재합니다.');

  if (input.provider.cancellation === 'full' || order?.status === 'cancelled' || order?.status === 'canceled') blockers.push('이미 전액 취소된 주문입니다.');
  if (input.provider.cancellation === 'partial') warnings.push('부분 취소 이력이 있어 누적 환불액과 잔여 권한을 수동 검토해야 합니다.');
  if (order?.applied_at) evidence.push('결제 승인 후 이용권 반영 기록이 있습니다. 환불 검토와 권한 조정은 별도 판단입니다.');
  else if (order?.paymentApproved) warnings.push('결제 승인 근거는 있으나 이용권 반영 기록은 없습니다.');

  let refundableAmount: number | null = null;
  if (order && input.provider.state === 'verified' && input.provider.refundedAmount != null) {
    if (!Number.isInteger(input.provider.refundedAmount) || input.provider.refundedAmount < 0 || input.provider.refundedAmount > order.amount) blockers.push('PG 기환불액 근거가 원결제 금액과 일치하지 않습니다.');
    else {
      const pendingAmount = activeRequests.reduce((sum, request) => sum + request.requested_amount, 0);
      refundableAmount = Math.max(0, order.amount - input.provider.refundedAmount - pendingAmount);
      evidence.push(`PG 확인 기환불액은 ${input.provider.refundedAmount}원입니다.`);
      if (input.requestedAmount > refundableAmount) blockers.push('환불 요청 금액이 PG 확인 잔액과 미완료 요청 금액을 반영한 범위를 초과합니다.');
    }
  } else {
    warnings.push('PG의 승인·취소·기환불 근거가 확인되지 않아 환불 가능 잔액을 확정할 수 없습니다.');
  }

  if (blockers.length) return { status: 'ineligible', eligibleForInternalReview: false, refundableAmount, entitlementApplied: Boolean(order?.applied_at), blockers, warnings, evidence };
  if (input.provider.state !== 'verified' || refundableAmount == null) return { status: 'hold', eligibleForInternalReview: false, refundableAmount: null, entitlementApplied: Boolean(order?.applied_at), blockers, warnings, evidence };
  return { status: 'eligible', eligibleForInternalReview: true, refundableAmount, entitlementApplied: Boolean(order?.applied_at), blockers, warnings, evidence };
}

export function validateRefundApproval(input: {
  requestStatus: RefundRequestStatus;
  requesterId: string;
  approverId: string;
  approverAuthorized: boolean;
  orderRevalidated: boolean;
}) {
  const blockers: string[] = [];
  if (!input.approverAuthorized) blockers.push('최종 승인 권한이 없습니다.');
  if (input.requesterId === input.approverId) blockers.push('요청자는 자기 요청을 승인할 수 없습니다.');
  if (!['under_review', 'received'].includes(input.requestStatus)) blockers.push('현재 상태에서는 중복 승인 또는 상태 변경을 수행할 수 없습니다.');
  if (!input.orderRevalidated) blockers.push('승인 직전 주문·PG 상태 재확인이 필요합니다.');
  return { allowed: blockers.length === 0, blockers };
}
