'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { getSessionWithRefreshRecovery } from '@/app/lib/supabase/auth';
import { toMasterClientError } from '../lib/clientErrors';
import {
  MASTER_PRODUCT_CATALOG,
  getDirectPurchaseMasterProducts,
} from '../lib/productCatalog';
import {
  canStartPaidPlanCheckout,
  getPaymentPageMode,
  getSubscriptionDisplaySummary,
  normalizeSubscriptionSummary,
  type SubscriptionSummaryData,
} from '../profile/subscriptionSummary';
import { buildMasterGateDisplayModel, readMasterGateContextFromSearchParams, type MasterGateContext } from '../lib/masterGateIntent';
import { buildMasterLoginHref } from '../lib/masterLoginReturn';
import { isTossClientKeyAllowed } from './tossClientKey';
import type { TossPaymentsSDK } from '@tosspayments/tosspayments-sdk';
import { trackMasterFunnelEvent } from '../lib/funnelEvents';
import { useMasterStore } from '../store';
import { BILLING_AUTH_CANCEL_MESSAGE, isBillingAuthUserCancellation } from './planPresentation';
import { PaymentPlanSelection } from './PaymentPlanSelection';

type PaidPlanId = 'lite' | 'premium';

type UpgradeQuote = { amountDueNow: number; nextBillingAt: string; nextBillingAmount: number };
type TossSdkStatus = 'loading' | 'ready' | 'missing-config' | 'load-error';

const BILLING_NOTICE = [
  '선택 즉시 첫 결제가 진행됩니다.',
  '이후 매월 최초 결제일에 자동 결제됩니다.',
  '언제든 구독 해지를 예약할 수 있습니다.',
  '해지 후에도 결제된 이용 기간 종료일까지 사용할 수 있습니다.',
  '기간제 유료 무료체험은 제공하지 않습니다.',
] as const;

const UPGRADE_BILLING_NOTICE = [
  '오늘 결제는 라이트 잔여 이용기간 가치를 반영한 서버 계산 차액입니다.',
  '기존 라이트 결제를 별도 환불하지 않습니다.',
  '결제 성공 즉시 프리미엄 권한이 적용됩니다.',
  '다음 결제일은 기존 라이트 이용 종료일이며, 그때 프리미엄 월 요금이 청구됩니다.',
  '해지 예약 중에는 즉시 업그레이드할 수 없습니다.',
] as const;

function isPaidPlanId(value: string | null): value is PaidPlanId {
  return value === 'lite' || value === 'premium';
}

function appendGateContext(params: URLSearchParams, context: MasterGateContext) {
  if (context.mode !== 'gated' || !context.intent) return;
  params.set('intent', context.intent);
  params.set('next', context.next);
  params.set('journeyId', context.journeyId);
  if (context.gateSurface) params.set('gateSurface', context.gateSurface);
}

function buildCustomerKey(userId: string) {
  return `spm_${userId.replaceAll('-', '')}`;
}

function PaymentContent() {
  const router = useRouter();
  const params = useSearchParams();
  const gateContext = useMemo(() => readMasterGateContextFromSearchParams(params), [params]);
  const gateDisplay = useMemo(
    () => (gateContext.mode === 'gated' && gateContext.intent ? buildMasterGateDisplayModel(gateContext) : null),
    [gateContext],
  );
  const programs = useMasterStore(state => state.programs);
  const loadPrograms = useMasterStore(state => state.loadPrograms);
  const selectedLessonTitle = gateContext.resource.kind === 'program' ? programs.find(program => program.id === gateContext.resource.id)?.title : undefined;
  useEffect(() => { if (gateContext.resource.kind === 'program') void loadPrograms(); }, [gateContext.resource.kind, loadPrograms]);
  const requestedPlan = isPaidPlanId(params.get('plan')) ? params.get('plan') as PaidPlanId : 'lite';
  const initialPlan = gateContext.allowedPlans.includes(requestedPlan) ? requestedPlan : gateContext.minimumPlan;
  const [selectedPlan, setSelectedPlan] = useState<PaidPlanId>(initialPlan);
  const [userId, setUserId] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [subscription, setSubscription] = useState<SubscriptionSummaryData | null>(null);
  const [upgradeQuote, setUpgradeQuote] = useState<UpgradeQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [workingPlan, setWorkingPlan] = useState<PaidPlanId | null>(null);
  const [error, setError] = useState('');
  const tossClientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? '';
  const reviewDeployment = process.env.NEXT_PUBLIC_VERCEL_ENV;
  const tossClientKeyAllowed = isTossClientKeyAllowed(tossClientKey, process.env.NODE_ENV, reviewDeployment);
  const [tossSdkStatus, setTossSdkStatus] = useState<TossSdkStatus>(tossClientKeyAllowed ? 'loading' : 'missing-config');
  const tossSdk = useRef<TossPaymentsSDK | null>(null);
  const checkoutLocked = useRef(false);
  const directProducts = useMemo(() => getDirectPurchaseMasterProducts(), []);
  const selectedProduct = MASTER_PRODUCT_CATALOG[selectedPlan];
  const subscriptionDisplay = getSubscriptionDisplaySummary(subscription);
  const paymentPageMode = getPaymentPageMode(subscription);
  const showPlanSelection = paymentPageMode === 'choosePlan' || paymentPageMode === 'liteUpgrade';

  useEffect(() => {
    if (paymentPageMode === 'liteUpgrade') {
      setSelectedPlan('premium');
    }
  }, [paymentPageMode]);

  useEffect(() => {
    if (!tossClientKeyAllowed) {
      setTossSdkStatus('missing-config');
      return;
    }
    let disposed = false;
    const timeoutId = window.setTimeout(() => {
      if (!disposed) setTossSdkStatus((current) => current === 'loading' ? 'load-error' : current);
    }, 8000);
    void import('@tosspayments/tosspayments-sdk')
      .then(({ loadTossPayments }) => loadTossPayments(tossClientKey))
      .then((sdk) => {
        if (!disposed) { tossSdk.current = sdk; setTossSdkStatus('ready'); }
      })
      .catch(() => { if (!disposed) setTossSdkStatus('load-error'); });
    return () => { disposed = true; window.clearTimeout(timeoutId); };
  }, [tossClientKey, tossClientKeyAllowed]);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const session = await getSessionWithRefreshRecovery(supabase);
        if (session?.user) {
          setUserId(session.user.id);
          setUserEmail(session.user.email ?? '');
          const res = await fetch('/api/spokedu-master/subscription', { cache: 'no-store' });
          const json = await res.json() as { error?: string };
          if (!res.ok) {
            setError(toMasterClientError(res.status, json.error).message);
          } else {
            const normalized = normalizeSubscriptionSummary(json);
            setSubscription(normalized);
            if (getPaymentPageMode(normalized) === 'liteUpgrade') {
              const quoteResponse = await fetch('/api/spokedu-master/payment/billing/upgrade-quote', { cache: 'no-store' });
              const quote = await quoteResponse.json().catch(() => null) as (UpgradeQuote & { error?: string }) | null;
              if (quoteResponse.ok && quote) setUpgradeQuote(quote);
              else setError(quote?.error ?? '업그레이드 결제 금액을 확인하지 못했습니다.');
            }
          }
        } else {
          window.location.replace(buildMasterLoginHref(`${window.location.pathname}${window.location.search}`));
          return;
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const startBillingAuth = async (plan: PaidPlanId) => {
    if (checkoutLocked.current) return;
    setSelectedPlan(plan);
    setError('');
    if (!userId) {
      setError('결제를 시작하려면 먼저 로그인해 주세요.');
      return;
    }
    if (!subscription) {
      setError('이용권 상태를 확인하지 못했습니다. 새로고침 후 다시 시도해 주세요.');
      return;
    }
    if (!gateContext.allowedPlans.includes(plan)) {
      setError(`${gateContext.minimumPlan === 'premium' ? '프리미엄' : 'Lite'} 이상이 필요한 작업입니다.`);
      return;
    }
    if (!canStartPaidPlanCheckout(subscription, plan)) {
      if (paymentPageMode === 'liteUpgrade' && plan === 'lite') {
        setError('라이트 이용 중에는 프리미엄으로 업그레이드할 수 있습니다.');
      } else {
        setError('현재 이용권 상태에서는 이 결제를 시작할 수 없습니다.');
      }
      return;
    }
    if (paymentPageMode === 'liteUpgrade' && plan === 'premium') {
      if (!upgradeQuote) {
        setError('업그레이드 결제 금액을 확인하는 중입니다. 잠시 후 다시 시도해 주세요.');
        return;
      }
      checkoutLocked.current = true;
      setWorkingPlan(plan);
      try {
        trackMasterFunnelEvent('checkout_started', { surface: 'payment', plan });
        const response = await fetch('/api/spokedu-master/payment/billing/issue', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ planId: 'premium', customerKey: buildCustomerKey(userId) }),
        });
        const result = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null;
        if (!response.ok || result?.ok !== true) throw new Error(result?.error ?? '업그레이드 결제에 실패했습니다.');
        router.push('/spokedu-lab/subscription?upgraded=1');
        router.refresh();
      } catch (upgradeError) {
        setError(upgradeError instanceof Error ? upgradeError.message : '업그레이드 결제에 실패했습니다.');
        checkoutLocked.current = false;
        setWorkingPlan(null);
      }
      return;
    }

    if (!tossClientKeyAllowed) {
      setError('결제 설정이 완료되지 않았습니다. 운영자에게 문의해 주세요.');
      return;
    }
    if (tossSdkStatus === 'load-error') {
      setError('결제 모듈을 불러오지 못했습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.');
      return;
    }
    if (tossSdkStatus !== 'ready' || !tossSdk.current) {
      setError('결제 모듈을 준비하고 있습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }
    const successUrl = new URL('/spokedu-lab/payment/success', window.location.origin);
    successUrl.searchParams.set('plan', plan);
    appendGateContext(successUrl.searchParams, gateContext);
    const failUrl = new URL('/spokedu-lab/payment/cancel', window.location.origin);
    failUrl.searchParams.set('plan', plan);
    appendGateContext(failUrl.searchParams, gateContext);

    checkoutLocked.current = true;
    setWorkingPlan(plan);
    let stage = 'prepare';
    try {
      const response = await fetch('/api/spokedu-master/payment/billing/prepare', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ planId: plan, clientKey: tossClientKey }),
      });
      const prepared = await response.json() as { customerKey?: string; error?: string; code?: string };
      if (!response.ok || !prepared.customerKey) {
        setError(`${prepared.error ?? '결제를 준비하지 못했습니다.'} [prepare / ${prepared.code ?? response.status}]`);
        return;
      }
      stage = 'billing_auth';
      trackMasterFunnelEvent('checkout_started', { surface: 'payment', plan });
      const payment = tossSdk.current.payment({ customerKey: prepared.customerKey });
      await payment.requestBillingAuth({
        method: 'CARD', successUrl: successUrl.toString(), failUrl: failUrl.toString(),
      });
    } catch (cause) {
      const code = cause && typeof cause === 'object' && 'code' in cause && typeof cause.code === 'string'
        && /^[A-Z0-9_]{1,80}$/.test(cause.code) ? cause.code : 'MODULE_OR_NETWORK_ERROR';
      setError(isBillingAuthUserCancellation(code) ? BILLING_AUTH_CANCEL_MESSAGE : `결제창을 열지 못했습니다. 잠시 후 다시 시도해 주세요. [${stage} / ${code}]`);
    } finally {
      checkoutLocked.current = false;
      setWorkingPlan(null);
    }
  };

  return <PaymentPlanSelection
    gateContext={gateContext} gateDisplay={gateDisplay} selectedLessonTitle={selectedLessonTitle}
    selectedPlan={selectedPlan} selectedProduct={selectedProduct} directProducts={directProducts}
    subscription={subscription} subscriptionDisplay={subscriptionDisplay} paymentPageMode={paymentPageMode}
    showPlanSelection={showPlanSelection} loading={loading} workingPlan={workingPlan}
    tossSdkStatus={tossSdkStatus} upgradeQuote={upgradeQuote} error={error} userEmail={userEmail}
    billingNotices={paymentPageMode === 'liteUpgrade' ? UPGRADE_BILLING_NOTICE : BILLING_NOTICE}
    onChoose={plan => { if (!checkoutLocked.current) setSelectedPlan(plan); }}
    onCheckout={planId => void startBillingAuth(planId)}
    onBack={() => { if (window.history.length > 1) router.back(); else router.replace(gateContext.mode === 'gated' ? gateContext.next : '/spokedu-lab/subscription'); }}
  />;
}

export default function PaymentPage() {
  return <Suspense><PaymentContent /></Suspense>;
}
