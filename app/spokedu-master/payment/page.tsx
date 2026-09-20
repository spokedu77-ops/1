'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Loader2, Mail, Shield } from 'lucide-react';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { toMasterClientError } from '../lib/clientErrors';
import {
  MASTER_CENTER_INQUIRY_HREF,
  MASTER_PRODUCT_CATALOG,
  getDirectPurchaseMasterProducts,
  getMasterProductPaymentDescription,
  getMasterProductPaymentFeatureLabels,
  type MasterProductCatalogItem,
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

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      requestBillingAuth: (method: string, options: Record<string, unknown>) => void;
    };
  }
}

type PaidPlanId = 'lite' | 'premium';

type UpgradeQuote = { amountDueNow: number; nextBillingAt: string; nextBillingAmount: number };

function formatBillingDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Seoul' }).format(new Date(value));
}

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

function formatKrw(value: number | null) {
  return value == null ? MASTER_PRODUCT_CATALOG.center.priceLabel : `월 ${value.toLocaleString('ko-KR')}원`;
}

function buildCustomerKey(userId: string) {
  return `spm_${userId.replaceAll('-', '')}`;
}

function productShortName(product: MasterProductCatalogItem) {
  return product.displayName.replace('SPOKEDU MASTER ', '');
}

function PlanCard({
  product,
  selected,
  disabled,
  working,
  actionLabel,
  disabledHint,
  onSelect,
}: {
  product: MasterProductCatalogItem;
  selected: boolean;
  disabled: boolean;
  working: boolean;
  actionLabel?: string;
  disabledHint?: string;
  onSelect: () => void;
}) {
  const planId = product.serverPlanKey;

  return (
    <section
      className="flex min-w-0 flex-col rounded-[18px] p-5"
      style={{
        background: selected ? 'var(--spm-acc-a13)' : 'var(--spm-s2)',
        border: selected ? '1.5px solid var(--spm-acc-a68)' : '1px solid var(--spm-br2)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[24px] font-black leading-tight" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)', letterSpacing: 0 }}>
            {productShortName(product)}
          </h2>
          <p className="mt-2 text-[26px] font-black leading-tight" style={{ color: 'var(--spm-t)' }}>
            {formatKrw(product.monthlyPriceKrw)}
          </p>
        </div>
        {selected ? <CheckCircle2 size={22} color="var(--spm-acc)" className="shrink-0" /> : null}
      </div>

      <p className="mt-4 text-[13px] font-semibold leading-6" style={{ color: 'var(--spm-t2)' }}>
        {getMasterProductPaymentDescription(product)}
      </p>

      <ul className="mt-4 space-y-2">
        {getMasterProductPaymentFeatureLabels(product).map((item) => (
          <li key={item} className="flex gap-2 text-[13px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>
            <CheckCircle2 size={14} color="var(--spm-grn)" className="mt-0.5 shrink-0" />
            <span className="min-w-0">{item}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled={disabled || working || !planId}
        onClick={onSelect}
        className="spm-btn-primary mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] px-3 text-[13px] font-black focus-visible:outline-none disabled:opacity-50"
        data-plan-id={planId ?? undefined}
      >
        {working && selected ? <Loader2 size={15} className="animate-spin" /> : null}
        {actionLabel ?? `${productShortName(product)} 구독 선택`}
      </button>
      {disabled && disabledHint ? (
        <p className="mt-3 text-center text-[12px] font-semibold leading-5" style={{ color: 'var(--spm-t3)' }}>
          {disabledHint}
        </p>
      ) : null}
    </section>
  );
}

function PaymentContent() {
  const params = useSearchParams();
  const gateContext = useMemo(() => readMasterGateContextFromSearchParams(params), [params]);
  const gateDisplay = useMemo(
    () => (gateContext.mode === 'gated' && gateContext.intent ? buildMasterGateDisplayModel(gateContext) : null),
    [gateContext],
  );
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
  const directProducts = useMemo(() => getDirectPurchaseMasterProducts(), []);
  const subscriptionDisplay = getSubscriptionDisplaySummary(subscription);
  const paymentPageMode = getPaymentPageMode(subscription);
  const showPlanSelection = paymentPageMode === 'choosePlan' || paymentPageMode === 'liteUpgrade';

  useEffect(() => {
    if (paymentPageMode === 'liteUpgrade') {
      setSelectedPlan('premium');
    }
  }, [paymentPageMode]);

  useEffect(() => {
    const script = document.querySelector<HTMLScriptElement>('script[data-toss-payments="true"]');
    if (script) return;
    const nextScript = document.createElement('script');
    nextScript.src = 'https://js.tosspayments.com/v1';
    nextScript.dataset.tossPayments = 'true';
    document.head.appendChild(nextScript);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
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
    setSelectedPlan(plan);
    setError('');
    if (!userId) {
      setError('결제를 시작하려면 먼저 로그인해 주세요.');
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
      setWorkingPlan(plan);
      try {
        const response = await fetch('/api/spokedu-master/payment/billing/issue', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ planId: 'premium', customerKey: buildCustomerKey(userId) }),
        });
        const result = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null;
        if (!response.ok || result?.ok !== true) throw new Error(result?.error ?? '업그레이드 결제에 실패했습니다.');
        window.location.assign('/spokedu-master/subscription?upgraded=1');
      } catch (upgradeError) {
        setError(upgradeError instanceof Error ? upgradeError.message : '업그레이드 결제에 실패했습니다.');
        setWorkingPlan(null);
      }
      return;
    }

    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? '';
    if (!clientKey || !window.TossPayments) {
      setError('결제 모듈을 불러오는 중입니다. 잠시 후 다시 시도해 주세요.');
      return;
    }
    const customerKey = buildCustomerKey(userId);
    const successUrl = new URL('/spokedu-master/payment/success', window.location.origin);
    successUrl.searchParams.set('plan', plan);
    appendGateContext(successUrl.searchParams, gateContext);
    const failUrl = new URL('/spokedu-master/payment/cancel', window.location.origin);
    failUrl.searchParams.set('plan', plan);
    appendGateContext(failUrl.searchParams, gateContext);

    setWorkingPlan(plan);
    try {
      window.TossPayments(clientKey).requestBillingAuth('카드', {
        customerKey,
        successUrl: successUrl.toString(),
        failUrl: failUrl.toString(),
      });
    } catch {
      setError('결제창을 열지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      // Toss auth UI is non-blocking; clear lock so cancel/return can retry.
      window.setTimeout(() => setWorkingPlan(null), 1200);
    }
  };

  return (
    <div className="min-h-dvh" style={{ background: 'var(--spm-bg)', color: 'var(--spm-t)', fontFamily: 'var(--spm-font-body)' }}>
      <header className="mx-auto flex w-full max-w-[1080px] items-center gap-3 px-5 pb-4 pt-5 sm:px-8">
        <Link href="/spokedu-master/subscription" className="grid h-11 w-11 place-items-center rounded-[10px]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }} aria-label="이전 화면">
          <ArrowLeft size={18} color="var(--spm-t2)" />
        </Link>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>SPOKEDU MASTER</p>
          <h1 className="text-[22px] font-black" style={{ fontFamily: 'var(--spm-font-display)' }}>
            {paymentPageMode === 'liteUpgrade' ? '프리미엄으로 이어가기' : gateDisplay ? '하던 작업 이어가기' : '구독 선택'}
          </h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1080px] space-y-5 px-5 pb-16 sm:px-8">
        {gateDisplay ? (
          <section className="rounded-[20px] p-5 sm:p-6" style={{ background: 'var(--spm-acc-a10)', border: '1px solid var(--spm-acc-a28)' }}>
            <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-acc)' }}>{gateDisplay.eyebrow}</p>
            <h2 className="mt-2 text-[22px] font-black leading-tight sm:text-[26px]" style={{ fontFamily: 'var(--spm-font-display)', letterSpacing: 0 }}>
              {gateDisplay.title}
            </h2>
            <p className="mt-3 max-w-[720px] text-[14px] font-semibold leading-6" style={{ color: 'var(--spm-t2)' }}>
              {gateDisplay.description}
            </p>
            <Link href={gateContext.next} className="mt-3 inline-flex min-h-11 items-center text-[13px] font-black" style={{ color: 'var(--spm-acc)' }}>
              이전 작업으로 돌아가기
            </Link>
          </section>
        ) : (
          <section className="rounded-[20px] p-5 sm:p-6" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <h2 className="text-[28px] font-black leading-tight sm:text-[32px]" style={{ fontFamily: 'var(--spm-font-display)', letterSpacing: 0 }}>
              {paymentPageMode === 'liteUpgrade'
                ? '새로운 콘텐츠와 지난 수업 맥락을 함께 이어가세요'
                : '좋은 콘텐츠를 찾고, 실제 수업과 다음 수업까지 이어가세요'}
            </h2>
            <p className="mt-3 max-w-[720px] text-[14px] font-semibold leading-6" style={{ color: 'var(--spm-t2)' }}>
              {paymentPageMode === 'liteUpgrade'
                ? 'Lite의 완전한 수업 운영은 그대로 유지됩니다. 프리미엄에서는 SPOMOVE로 활동 선택을 넓히고, 지난 기록과 학생 맥락을 다음 준비에 다시 활용합니다.'
                : 'Lite는 콘텐츠 발견부터 수업 구성·운영까지 완결됩니다. 프리미엄은 SPOMOVE와 더 깊은 기록 재사용으로 다음 수업에서 다시 찾고 판단하는 일을 줄입니다.'}
            </p>
          </section>
        )}

        {loading ? (
          <section className="flex h-28 items-center justify-center rounded-[18px]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <Loader2 size={22} className="animate-spin" color="var(--spm-t3)" />
          </section>
        ) : !showPlanSelection ? (
          <section className="rounded-[18px] p-5 text-center" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <CheckCircle2 size={44} color="var(--spm-grn)" className="mx-auto" />
            <h2 className="mt-3 text-[20px] font-black">{subscriptionDisplay.planLabel} 이용 중</h2>
            <p className="mt-2 text-[13px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>
              {subscriptionDisplay.state === 'cancelScheduled'
                ? subscriptionDisplay.description
                : '현재 이용권이 활성화되어 있습니다.'}
            </p>
            <Link href="/spokedu-master/subscription" className="spm-btn-primary mx-auto mt-4 inline-flex h-11 max-w-[260px] items-center justify-center rounded-[10px] text-[13px] font-black focus-visible:outline-none">
              구독 관리
            </Link>
          </section>
        ) : (
          <>
            {paymentPageMode === 'liteUpgrade' ? (
              <section className="rounded-[18px] p-4" style={{ background: 'var(--spm-acc-a10)', border: '1px solid var(--spm-acc-a28)' }}>
                <p className="text-[13px] font-semibold leading-6" style={{ color: 'var(--spm-t2)' }}>
                  현재 <strong>{subscriptionDisplay.planLabel}</strong>으로 콘텐츠 발견부터 수업 운영까지 완결되어 있습니다. 프리미엄으로 올리면 SPOMOVE로 활동을 넓히고 지난 기록을 다음 준비에 다시 활용할 수 있습니다. 오늘 결제액은 라이트 잔여 기간을 반영한 차액이며, 프리미엄 정가를 새로 1개월 결제하지 않습니다.
                </p>
                {upgradeQuote ? (
                  <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div><dt className="text-[11px] font-semibold" style={{ color: 'var(--spm-t3)' }}>오늘 결제</dt><dd className="mt-1 text-[16px] font-black">{upgradeQuote.amountDueNow.toLocaleString('ko-KR')}원</dd></div>
                    <div><dt className="text-[11px] font-semibold" style={{ color: 'var(--spm-t3)' }}>다음 결제일</dt><dd className="mt-1 text-[16px] font-black">{formatBillingDate(upgradeQuote.nextBillingAt)}</dd></div>
                    <div><dt className="text-[11px] font-semibold" style={{ color: 'var(--spm-t3)' }}>다음 결제 금액</dt><dd className="mt-1 text-[16px] font-black">{upgradeQuote.nextBillingAmount.toLocaleString('ko-KR')}원</dd></div>
                  </dl>
                ) : null}
              </section>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2">
              {directProducts.map((product) => {
                const planId = product.serverPlanKey as PaidPlanId;
                const planAllowedForIntent = gateContext.allowedPlans.includes(planId);
                const canCheckout = planAllowedForIntent && canStartPaidPlanCheckout(subscription, planId);
                return (
                  <PlanCard
                    key={product.id}
                    product={product}
                    selected={selectedPlan === product.id}
                    disabled={!canCheckout}
                    working={workingPlan === product.id}
                    actionLabel={
                      paymentPageMode === 'liteUpgrade' && planId === 'premium'
                        ? '프리미엄으로 업그레이드'
                        : undefined
                    }
                    disabledHint={
                      !planAllowedForIntent
                        ? '지금 이어가려던 작업은 프리미엄이 필요합니다.'
                        : paymentPageMode === 'liteUpgrade' && planId === 'lite'
                          ? '현재 라이트 이용 중입니다.'
                          : undefined
                    }
                    onSelect={() => void startBillingAuth(planId)}
                  />
                );
              })}
            </div>

            <section className="rounded-[18px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
              <Shield size={18} color="var(--spm-grn)" />
              <h3 className="mt-3 text-[15px] font-black">정기결제 안내</h3>
              <ul className="mt-3 space-y-2">
                {(paymentPageMode === 'liteUpgrade' ? UPGRADE_BILLING_NOTICE : BILLING_NOTICE).map((item) => (
                  <li key={item} className="flex gap-2 text-[12px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>
                    <CheckCircle2 size={14} color="var(--spm-grn)" className="mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[11px] font-semibold leading-5" style={{ color: 'var(--spm-t3)' }}>
                <Link href="/spokedu-master/terms" className="inline-flex min-h-11 items-center" style={{ color: 'var(--spm-acc)' }}>이용약관</Link>
                <span className="mx-1">및</span>
                <Link href="/spokedu-master/privacy" className="inline-flex min-h-11 items-center" style={{ color: 'var(--spm-acc)' }}>개인정보처리방침</Link>
                <span>을 확인해 주세요.</span>
              </p>
            </section>

            <section className="rounded-[18px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
              <Mail size={18} color="var(--spm-acc)" />
              <h3 className="mt-3 text-[15px] font-black">센터·기관에서 사용하시나요?</h3>
              <p className="mt-2 text-[13px] font-semibold leading-6" style={{ color: 'var(--spm-t2)' }}>
                이용 인원과 운영 방식에 맞춰 별도로 안내합니다.
              </p>
              <a
                href={MASTER_CENTER_INQUIRY_HREF}
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[12px] px-4 text-[13px] font-black"
                style={{ background: 'var(--spm-s3)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}
              >
                센터·기관 도입 문의
              </a>
            </section>

            <section className="rounded-[18px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
              <p className="text-[13px] font-black">결제 계정</p>
              <div className="mt-3 rounded-[12px] p-3" style={{ background: 'var(--spm-s3)' }}>
                <p className="text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>{userEmail}</p>
                <p className="mt-1 text-[12px] font-semibold" style={{ color: 'var(--spm-t2)' }}>
                  금액은 서버의 상품 계약으로 다시 계산하고 검증합니다.
                </p>
              </div>
            </section>
          </>
        )}

        {error ? (
          <p className="rounded-[12px] p-3 text-[12px] font-bold" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.22)', color: 'var(--spm-red)' }}>
            {error}
          </p>
        ) : null}
      </main>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense>
      <PaymentContent />
    </Suspense>
  );
}
