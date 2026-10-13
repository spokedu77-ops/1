import { classifySpokeduMasterBillingMode, validateSpokeduMasterChargedAmount } from './spokeduMasterBillingMode';
import { isSpokeduMasterPaidPlan } from './spokeduMasterPayment';
import {
  SPOKEDU_MASTER_BILLING_PROCESSING_STALE_MS,
  SPOKEDU_MASTER_BILLING_PROCESSING_WARNING_MS,
} from './spokeduMasterBillingOrders';

export type BillingRecoveryStatus =
  | 'applied'
  | 'recovery_candidate'
  | 'verification_required'
  | 'not_recoverable'
  | 'manual_review'
  | 'data_lookup_error';

export type BillingRecoveryOrder = {
  order_id: string;
  user_id: string;
  plan: string;
  amount: number;
  status: string;
  billing_cycle_key: string | null;
  created_at: string;
  updated_at: string;
  applied_at: string | null;
  last_processed_at: string | null;
  last_error_code: string | null;
  paymentApproved: boolean;
};

export type BillingRecoverySubscription = {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  pg_provider: string | null;
  toss_order_id: string | null;
  current_period_end: string | null;
};

export type BillingRecoveryWebhook = {
  event_key: string;
  event_type: string;
  order_id: string | null;
  status: string;
  created_at: string;
};

export type BillingRecoveryDiagnosis = {
  orderId: string;
  status: BillingRecoveryStatus;
  label: string;
  orderKind: 'initial' | 'upgrade' | 'renewal' | 'invalid';
  evidence: string[];
  blockers: string[];
  checksRequired: string[];
  entitlement: { applied: boolean; subscriptionActive: boolean; plan: string | null };
  processing: { warningAt: string | null; reclaimableAt: string | null; phase: 'not_processing' | 'within_warning' | 'warning' | 'reclaimable' };
  recommendedAction: string;
};

const STATUS_LABEL: Record<BillingRecoveryStatus, string> = {
  applied: '정상 반영',
  recovery_candidate: '복구 후보',
  verification_required: '추가 검증 필요',
  not_recoverable: '복구 불가',
  manual_review: '수동 검토',
  data_lookup_error: '데이터 조회 오류',
};

function processingState(order: BillingRecoveryOrder, now: number): BillingRecoveryDiagnosis['processing'] {
  if (order.status !== 'processing') return { warningAt: null, reclaimableAt: null, phase: 'not_processing' };
  const base = Date.parse(order.last_processed_at ?? order.updated_at);
  if (!Number.isFinite(base)) return { warningAt: null, reclaimableAt: null, phase: 'warning' };
  const warningAt = base + SPOKEDU_MASTER_BILLING_PROCESSING_WARNING_MS;
  const reclaimableAt = base + SPOKEDU_MASTER_BILLING_PROCESSING_STALE_MS;
  return {
    warningAt: new Date(warningAt).toISOString(),
    reclaimableAt: new Date(reclaimableAt).toISOString(),
    phase: now >= reclaimableAt ? 'reclaimable' : now >= warningAt ? 'warning' : 'within_warning',
  };
}

function result(input: Omit<BillingRecoveryDiagnosis, 'label'>): BillingRecoveryDiagnosis {
  return { ...input, label: STATUS_LABEL[input.status] };
}

export function diagnoseSpokeduMasterBillingRecovery(input: {
  order: BillingRecoveryOrder;
  subscription: BillingRecoverySubscription | null;
  webhooks: BillingRecoveryWebhook[];
  now?: number;
}): BillingRecoveryDiagnosis {
  const { order, subscription, webhooks } = input;
  const now = input.now ?? Date.now();
  const evidence: string[] = [];
  const blockers: string[] = [];
  const checksRequired: string[] = [];
  const processing = processingState(order, now);
  const orderKind = classifySpokeduMasterBillingMode({ orderId: order.order_id, userId: order.user_id, plan: order.plan, billingCycleKey: order.billing_cycle_key });
  const processedWebhook = webhooks.some((event) => event.status === 'processed');
  const partialCancel = order.last_error_code === 'partial_cancel_review_required' || webhooks.some((event) => event.event_type === 'partial_cancel_review_required');
  const fullCancel = order.status === 'cancelled' || webhooks.some((event) => event.event_type === 'cancel' && event.status === 'processed');
  const subscriptionActive = Boolean(subscription?.status === 'active' && subscription.pg_provider !== 'manual_qa');
  const entitlementApplied = Boolean(order.applied_at && subscriptionActive && subscription?.user_id === order.user_id && subscription?.plan === order.plan && subscription?.toss_order_id === order.order_id);

  if (order.paymentApproved) evidence.push('DB에 결제 승인 식별 근거가 저장되어 있습니다.');
  else blockers.push('DB에 결제 승인 식별 근거가 없습니다.');
  if (processedWebhook) evidence.push('처리 완료된 결제 웹훅 기록이 있습니다.');
  if (order.applied_at) evidence.push(`권한 반영 시각이 기록되어 있습니다: ${order.applied_at}`);
  if (subscriptionActive) evidence.push('실제 결제 제공자 기반 활성 구독이 연결되어 있습니다.');
  if (order.last_error_code) evidence.push(`최근 처리 오류: ${order.last_error_code}`);
  checksRequired.push('실제 복구 실행 전 Toss 조회로 승인·취소·환불 최종 상태를 확인해야 합니다.');

  if (orderKind === 'invalid') blockers.push('주문 ID·사용자·플랜 또는 결제 주기 식별자가 기존 계약과 일치하지 않습니다.');
  if (!isSpokeduMasterPaidPlan(order.plan)) blockers.push('지원하지 않는 요금제입니다.');
  else if (orderKind !== 'invalid' && validateSpokeduMasterChargedAmount({ mode: orderKind, plan: order.plan, orderAmount: order.amount, tossTotalAmount: order.amount }) !== 'ok') blockers.push('요금제와 주문 금액이 기존 결제 계약과 일치하지 않습니다.');
  if (subscription && subscription.user_id !== order.user_id) blockers.push('주문 소유자와 연결 구독 소유자가 일치하지 않습니다.');
  if (subscription && subscription.plan !== order.plan) blockers.push('주문 요금제와 연결 구독 요금제가 일치하지 않습니다.');
  if (subscription?.pg_provider === 'manual_qa') blockers.push('수동 QA 구독은 실제 유료 결제 복구 대상이 아닙니다.');

  const base = { orderId: order.order_id, orderKind, evidence, blockers, checksRequired, entitlement: { applied: entitlementApplied, subscriptionActive, plan: subscription?.plan ?? null }, processing };
  if (partialCancel) return result({ ...base, status: 'manual_review', recommendedAction: '부분 취소 금액과 남은 권한 정책을 담당자가 검토합니다.' });
  if (fullCancel) return result({ ...base, status: 'manual_review', recommendedAction: '전액 취소 근거와 현재 구독·권한 잔존 여부를 검토합니다.' });
  if (blockers.some((item) => item.includes('일치하지') || item.includes('QA 구독') || item.includes('지원하지'))) return result({ ...base, status: 'manual_review', recommendedAction: '주문·구독 계약 불일치를 먼저 해소하고 복구 여부를 재판정합니다.' });
  if (entitlementApplied && order.status === 'active') return result({ ...base, status: 'applied', recommendedAction: '추가 복구 없이 상태를 모니터링합니다.' });
  if (order.paymentApproved && !entitlementApplied) return result({ ...base, status: 'recovery_candidate', recommendedAction: 'PG 승인 상태를 추가 확인한 뒤 별도 승인된 재적용 절차를 검토합니다.' });
  if (order.status === 'processing') return result({ ...base, status: 'verification_required', recommendedAction: processing.phase === 'reclaimable' ? 'lease 만료 상태입니다. PG 처리 결과와 워커 로그를 확인합니다.' : '15분 lease 만료 전까지 PG 처리 결과와 워커 상태를 관찰합니다.' });
  if (!order.paymentApproved) return result({ ...base, status: 'not_recoverable', recommendedAction: '재적용하지 말고 결제 승인 여부를 PG에서 별도로 확인합니다.' });
  return result({ ...base, status: 'verification_required', recommendedAction: 'DB 근거만으로 결론 내리지 말고 PG와 웹훅 상태를 교차 확인합니다.' });
}

export function billingRecoveryLookupError(orderId: string): BillingRecoveryDiagnosis {
  return result({ orderId, status: 'data_lookup_error', orderKind: 'invalid', evidence: [], blockers: ['진단 데이터 조회를 완료하지 못했습니다.'], checksRequired: ['조회 오류를 해결한 뒤 다시 진단해야 합니다.'], entitlement: { applied: false, subscriptionActive: false, plan: null }, processing: { warningAt: null, reclaimableAt: null, phase: 'not_processing' }, recommendedAction: '데이터 조회를 재시도하고 계속 실패하면 서버 로그를 확인합니다.' });
}
