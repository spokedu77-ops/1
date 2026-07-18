'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Loader2, Mail, Shield } from 'lucide-react';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { MasterEmailOtpForm } from '@/app/components/auth/MasterEmailOtpForm';
import { useMasterEmailOtp } from '@/app/components/auth/useMasterEmailOtp';
import { applyLoginSessionPreference, readKeepLoggedInPreference } from '@/app/lib/auth/sessionPersistence';
import { rememberLastUsedAppFromPath } from '@/app/lib/auth/lastUsedApp';
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

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      requestBillingAuth: (method: string, options: Record<string, unknown>) => void;
    };
  }
}

type PaidPlanId = 'lite' | 'premium';

const BILLING_NOTICE = [
  '선택 즉시 첫 결제가 진행됩니다.',
  '이후 매월 최초 결제일에 자동 결제됩니다.',
  '언제든 구독 해지를 예약할 수 있습니다.',
  '해지 후에도 결제된 이용 기간 종료일까지 사용할 수 있습니다.',
  '무료 체험은 제공하지 않습니다.',
] as const;

function isPaidPlanId(value: string | null): value is PaidPlanId {
  return value === 'lite' || value === 'premium';
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
        className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] px-3 text-[13px] font-black text-white disabled:opacity-50"
        data-plan-id={planId ?? undefined}
        style={{ background: 'var(--spm-acc)' }}
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
  const initialPlan = isPaidPlanId(params.get('plan')) ? params.get('plan') as PaidPlanId : 'premium';
  const [selectedPlan, setSelectedPlan] = useState<PaidPlanId>(initialPlan);
  const masterOtp = useMasterEmailOtp();
  const [isAuthed, setIsAuthed] = useState(false);
  const [userId, setUserId] = useState('');
  const [subscription, setSubscription] = useState<SubscriptionSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [workingPlan, setWorkingPlan] = useState<PaidPlanId | null>(null);
  const [error, setError] = useState('');
  const [keepLoggedIn] = useState(() => readKeepLoggedInPreference());

  const email = isAuthed ? (masterOtp.email || '') : masterOtp.email;
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
          setIsAuthed(true);
          masterOtp.setEmail(session.user.email ?? '');
          setUserId(session.user.id);
          const res = await fetch('/api/spokedu-master/subscription', { cache: 'no-store' });
          const json = await res.json() as { error?: string };
          if (!res.ok) {
            setError(toMasterClientError(res.status, json.error).message);
          } else {
            setSubscription(normalizeSubscriptionSummary(json));
          }
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 마운트 시 1회만 세션 로드
  }, []);

  const handleOtpSubmit = async () => {
    setError('');
    const result = await masterOtp.submit();
    if (!result.ok) {
      setError(result.message);
      return;
    }
    if (result.kind === 'sent') return;
    applyLoginSessionPreference(keepLoggedIn);
    rememberLastUsedAppFromPath('/spokedu-master/payment');
    setIsAuthed(true);
    setUserId(result.user.id);
    masterOtp.setEmail(result.user.email ?? masterOtp.email);
  };

  const startBillingAuth = (plan: PaidPlanId) => {
    setSelectedPlan(plan);
    setError('');
    if (!isAuthed || !userId) {
      setError('결제를 시작하려면 먼저 로그인해 주세요.');
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
    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? '';
    if (!clientKey || !window.TossPayments) {
      setError('결제 모듈을 불러오는 중입니다. 잠시 후 다시 시도해 주세요.');
      return;
    }
    const customerKey = buildCustomerKey(userId);
    const successUrl = new URL('/spokedu-master/payment/success', window.location.origin);
    successUrl.searchParams.set('plan', plan);
    const failUrl = new URL('/spokedu-master/payment/cancel', window.location.origin);
    failUrl.searchParams.set('plan', plan);

    setWorkingPlan(plan);
    window.TossPayments(clientKey).requestBillingAuth('카드', {
      customerKey,
      successUrl: successUrl.toString(),
      failUrl: failUrl.toString(),
    });
  };

  return (
    <div className="min-h-dvh" style={{ background: 'var(--spm-bg)', color: 'var(--spm-t)', fontFamily: 'var(--spm-font-body)' }}>
      <header className="mx-auto flex w-full max-w-[1080px] items-center gap-3 px-5 pb-4 pt-5 sm:px-8">
        <Link href="/spokedu-master/subscription" className="grid h-11 w-11 place-items-center rounded-[10px]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }} aria-label="이전 화면">
          <ArrowLeft size={18} color="var(--spm-t2)" />
        </Link>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>SPOKEDU MASTER</p>
          <h1 className="text-[22px] font-black" style={{ fontFamily: 'var(--spm-font-display)' }}>구독 선택</h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1080px] space-y-5 px-5 pb-16 sm:px-8">
        <section className="rounded-[20px] p-5 sm:p-6" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <h2 className="text-[28px] font-black leading-tight sm:text-[32px]" style={{ fontFamily: 'var(--spm-font-display)', letterSpacing: 0 }}>
            {paymentPageMode === 'liteUpgrade'
              ? '프리미엄으로 업그레이드하세요.'
              : '라이트와 프리미엄 중 필요한 구독을 선택하세요.'}
          </h2>
          <p className="mt-3 max-w-[720px] text-[14px] font-semibold leading-6" style={{ color: 'var(--spm-t2)' }}>
            {paymentPageMode === 'liteUpgrade'
              ? 'SPOMOVE·프리미엄 자료를 포함한 전체 기능을 이용할 수 있습니다. 결제수단 인증 후 차액 결제로 즉시 업그레이드됩니다.'
              : '결제수단 인증 후 첫 결제가 성공한 경우에만 구독이 활성화됩니다.'}
          </p>
        </section>

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
            <Link href="/spokedu-master/subscription" className="mx-auto mt-4 inline-flex h-11 max-w-[260px] items-center justify-center rounded-[10px] text-[13px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
              구독 관리
            </Link>
          </section>
        ) : (
          <>
            {paymentPageMode === 'liteUpgrade' ? (
              <section className="rounded-[18px] p-4" style={{ background: 'var(--spm-acc-a10)', border: '1px solid var(--spm-acc-a28)' }}>
                <p className="text-[13px] font-semibold leading-6" style={{ color: 'var(--spm-t2)' }}>
                  현재 <strong>{subscriptionDisplay.planLabel}</strong> 이용 중입니다. 프리미엄으로 업그레이드하면 SPOMOVE와 프리미엄 자료를 바로 이용할 수 있습니다.
                </p>
              </section>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2">
              {directProducts.map((product) => {
                const planId = product.serverPlanKey as PaidPlanId;
                const canCheckout = canStartPaidPlanCheckout(subscription, planId);
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
                      paymentPageMode === 'liteUpgrade' && planId === 'lite'
                        ? '현재 라이트 이용 중입니다.'
                        : undefined
                    }
                    onSelect={() => startBillingAuth(planId)}
                  />
                );
              })}
            </div>

            <section className="rounded-[18px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
              <Shield size={18} color="var(--spm-grn)" />
              <h3 className="mt-3 text-[15px] font-black">정기결제 안내</h3>
              <ul className="mt-3 space-y-2">
                {BILLING_NOTICE.map((item) => (
                  <li key={item} className="flex gap-2 text-[12px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>
                    <CheckCircle2 size={14} color="var(--spm-grn)" className="mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[11px] font-semibold leading-5" style={{ color: 'var(--spm-t3)' }}>
                <Link href="/spokedu-master/terms" style={{ color: 'var(--spm-acc)' }}>이용약관</Link>
                <span className="mx-1">및</span>
                <Link href="/spokedu-master/privacy" style={{ color: 'var(--spm-acc)' }}>개인정보처리방침</Link>
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
              <p className="text-[13px] font-black">계정 확인</p>
              <div className="mt-3 text-[13px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>
                <p>결제수단 인증을 시작하려면 먼저 로그인해 주세요.</p>
                <p className="mt-1">금액은 서버의 상품 계약으로 다시 검증됩니다.</p>
              </div>

              {!isAuthed ? (
                <MasterEmailOtpForm
                  variant="payment"
                  email={masterOtp.email}
                  otp={masterOtp.otp}
                  otpSent={masterOtp.otpSent}
                  loading={masterOtp.loading}
                  message={masterOtp.message}
                  sendLabel="인증 코드 받기"
                  verifyLabel="인증 확인"
                  onEmailChange={masterOtp.setEmail}
                  onOtpChange={masterOtp.setOtp}
                  onSubmit={() => void handleOtpSubmit()}
                />
              ) : (
                <div className="mt-4 rounded-[12px] p-3" style={{ background: 'var(--spm-s3)' }}>
                  <p className="text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>{email}</p>
                  <p className="mt-1 text-[12px] font-semibold" style={{ color: 'var(--spm-t2)' }}>
                    이용권 카드의 선택 버튼으로 결제수단 인증을 시작합니다.
                  </p>
                </div>
              )}
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
