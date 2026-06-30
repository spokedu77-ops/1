'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, CreditCard, Loader2, Mail, Shield } from 'lucide-react';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { toMasterClientError } from '../lib/clientErrors';
import {
  MASTER_PRODUCT_CATALOG,
  buildMasterSupportMailto,
  getDirectPurchaseMasterProducts,
  type MasterProductCatalogItem,
} from '../lib/productCatalog';

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      requestBillingAuth: (method: string, options: Record<string, unknown>) => void;
    };
  }
}

type PaidPlanId = 'lite' | 'premium';
type SubscriptionState = {
  plan: string;
  status: string;
  periodEnd: string | null;
  nextBillingAt?: string | null;
  isAdmin?: boolean;
};

const BILLING_NOTICE = [
  '월 자동결제 상품',
  '매월 최초 결제일에 자동 결제',
  '언제든 해지 가능',
  '해지 후 결제된 이용 기간까지 사용 가능',
  '무료 체험 없음',
] as const;

function isPaidPlanId(value: string | null): value is PaidPlanId {
  return value === 'lite' || value === 'premium';
}

function formatKrw(value: number | null) {
  return value == null ? MASTER_PRODUCT_CATALOG.center.priceLabel : `월 ${value.toLocaleString('ko-KR')}원`;
}

function getFeatureBullets(product: MasterProductCatalogItem) {
  if (product.id === 'lite') {
    return ['SPOMOVE 제외', '라이브러리·수업 도구·기록·안내문 사용'];
  }
  if (product.id === 'premium') {
    return ['전체 기능', 'SPOMOVE 포함', 'SPOMAT 회원가 15,900원'];
  }
  return ['별도 문의', '직접 결제 버튼 없음'];
}

function buildCustomerKey(userId: string) {
  return `spm_${userId.replaceAll('-', '')}`;
}

function PlanCard({
  product,
  active,
  disabled,
  onSelect,
}: {
  product: MasterProductCatalogItem;
  active: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const purchasable = product.purchasable && product.serverPlanKey;
  return (
    <section
      className="rounded-[18px] p-5"
      style={{
        background: active ? 'rgba(99,102,241,0.14)' : 'var(--spm-s2)',
        border: active ? '1.5px solid rgba(99,102,241,0.72)' : '1px solid var(--spm-br2)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black" style={{ color: active ? 'var(--spm-acc)' : 'var(--spm-t3)' }}>
            {product.billingCycleLabel}
          </p>
          <h2 className="mt-2 text-[24px] font-black" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>
            {product.displayName}
          </h2>
        </div>
        {active ? <CheckCircle2 size={22} color="var(--spm-acc)" /> : null}
      </div>
      <p className="mt-4 text-[26px] font-black" style={{ color: 'var(--spm-t)' }}>
        {formatKrw(product.monthlyPriceKrw)}
      </p>
      <ul className="mt-4 space-y-2">
        {getFeatureBullets(product).map((item) => (
          <li key={item} className="flex gap-2 text-[13px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>
            <CheckCircle2 size={14} color="var(--spm-grn)" className="mt-0.5 shrink-0" />
            {item}
          </li>
        ))}
      </ul>
      {purchasable ? (
        <button
          type="button"
          disabled={disabled}
          onClick={onSelect}
          className="mt-5 h-11 w-full rounded-[12px] text-[13px] font-black disabled:opacity-50"
          style={{ background: active ? 'var(--spm-acc)' : 'var(--spm-s3)', color: active ? '#fff' : 'var(--spm-t)' }}
        >
          {active ? '선택됨' : '선택'}
        </button>
      ) : (
        <a
          href={buildMasterSupportMailto('SPOKEDU MASTER 센터·기관 문의')}
          className="mt-5 flex h-11 w-full items-center justify-center rounded-[12px] text-[13px] font-black"
          style={{ background: 'var(--spm-s3)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}
        >
          별도 문의
        </a>
      )}
    </section>
  );
}

function PaymentContent() {
  const params = useSearchParams();
  const initialPlan = isPaidPlanId(params.get('plan')) ? params.get('plan') as PaidPlanId : 'premium';
  const [selectedPlan, setSelectedPlan] = useState<PaidPlanId>(initialPlan);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [userId, setUserId] = useState('');
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  const directProducts = useMemo(() => getDirectPurchaseMasterProducts(), []);
  const selectedProduct = MASTER_PRODUCT_CATALOG[selectedPlan];
  const activePaid = subscription?.status === 'active' && (
    subscription.plan === 'lite' ||
    subscription.plan === 'premium' ||
    subscription.plan === 'team' ||
    subscription.isAdmin
  );

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
          setEmail(session.user.email ?? '');
          setUserId(session.user.id);
          const res = await fetch('/api/spokedu-master/subscription', { cache: 'no-store' });
          const json = await res.json() as SubscriptionState & { error?: string };
          if (!res.ok) {
            setError(toMasterClientError(res.status, json.error).message);
          } else {
            setSubscription(json);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const sendOtp = async () => {
    if (!email.includes('@')) {
      setError('이메일 주소를 입력해 주세요.');
      return;
    }
    setWorking(true);
    setError('');
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
      if (authError) {
        setError('로그인 링크를 보내지 못했습니다. 잠시 후 다시 시도해 주세요.');
        return;
      }
      setOtpSent(true);
    } finally {
      setWorking(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length < 6) {
      setError('이메일로 받은 6자리 코드를 입력해 주세요.');
      return;
    }
    setWorking(true);
    setError('');
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: authError } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });
      if (authError || !data.user) {
        setError('인증 코드를 확인하지 못했습니다.');
        return;
      }
      setIsAuthed(true);
      setUserId(data.user.id);
      setEmail(data.user.email ?? email);
    } finally {
      setWorking(false);
    }
  };

  const startBillingAuth = () => {
    setError('');
    if (!isAuthed || !userId) {
      setError('결제를 시작하려면 먼저 로그인해 주세요.');
      return;
    }
    if (activePaid) {
      setError('이미 활성 이용권이 있습니다. 중복 결제는 막혀 있습니다.');
      return;
    }
    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? '';
    if (!clientKey || !window.TossPayments) {
      setError('결제 모듈을 불러오는 중입니다. 잠시 후 다시 시도해 주세요.');
      return;
    }
    const customerKey = buildCustomerKey(userId);
    const successUrl = new URL('/spokedu-master/payment/success', window.location.origin);
    successUrl.searchParams.set('plan', selectedPlan);
    const failUrl = new URL('/spokedu-master/payment/cancel', window.location.origin);
    failUrl.searchParams.set('plan', selectedPlan);

    setWorking(true);
    window.TossPayments(clientKey).requestBillingAuth('카드', {
      customerKey,
      successUrl: successUrl.toString(),
      failUrl: failUrl.toString(),
    });
  };

  const activePlanLabel = subscription?.plan === 'lite'
    ? MASTER_PRODUCT_CATALOG.lite.displayName
    : subscription?.plan === 'premium'
      ? MASTER_PRODUCT_CATALOG.premium.displayName
      : subscription?.plan === 'team' || subscription?.isAdmin
        ? MASTER_PRODUCT_CATALOG.center.displayName
        : null;

  return (
    <div className="min-h-dvh" style={{ background: 'var(--spm-bg)', color: 'var(--spm-t)', fontFamily: 'var(--spm-font-body)' }}>
      <header className="mx-auto flex w-full max-w-[1120px] items-center gap-3 px-5 pb-4 pt-5 sm:px-8">
        <Link href="/spokedu-master/subscription" className="grid h-10 w-10 place-items-center rounded-[10px]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }} aria-label="이전 화면">
          <ArrowLeft size={18} color="var(--spm-t2)" />
        </Link>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>SPOKEDU MASTER</p>
          <h1 className="text-[22px] font-black" style={{ fontFamily: 'var(--spm-font-display)' }}>이용권 선택</h1>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1120px] gap-5 px-5 pb-16 sm:px-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-5">
          <section className="rounded-[22px] p-6" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <h2 className="text-[30px] font-black leading-tight" style={{ fontFamily: 'var(--spm-font-display)' }}>
              라이트와 프리미엄 중 필요한 이용권을 선택하세요.
            </h2>
            <p className="mt-3 text-[14px] font-semibold leading-6" style={{ color: 'var(--spm-t2)' }}>
              결제수단 인증 후 첫 결제가 성공한 경우에만 구독이 활성화됩니다. 무료 체험과 30일 단건 결제는 제공하지 않습니다.
            </p>
          </section>

          <div className="grid gap-3 md:grid-cols-3">
            {directProducts.map((product) => (
              <PlanCard
                key={product.id}
                product={product}
                active={selectedPlan === product.id}
                disabled={Boolean(activePaid)}
                onSelect={() => setSelectedPlan(product.id as PaidPlanId)}
              />
            ))}
            <PlanCard
              product={MASTER_PRODUCT_CATALOG.center}
              active={false}
              disabled
              onSelect={() => undefined}
            />
          </div>

          <section className="rounded-[18px] p-5" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)' }}>
            <Shield size={18} color="var(--spm-grn)" />
            <h3 className="mt-3 text-[15px] font-black">자동결제 안내</h3>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {BILLING_NOTICE.map((item) => (
                <li key={item} className="flex gap-2 text-[12px] font-semibold" style={{ color: 'var(--spm-t2)' }}>
                  <CheckCircle2 size={14} color="var(--spm-grn)" className="mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] font-semibold" style={{ color: 'var(--spm-t3)' }}>
              <Link href="/spokedu-master/terms" style={{ color: 'var(--spm-acc)' }}>이용약관</Link>과 <Link href="/spokedu-master/privacy" style={{ color: 'var(--spm-acc)' }}>개인정보처리방침</Link>을 확인해 주세요.
            </p>
          </section>
        </section>

        <aside className="space-y-4">
          <section className="rounded-[20px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <p className="text-[13px] font-black">결제 요약</p>
            <div className="mt-4 space-y-3 text-[13px] font-semibold">
              <div className="flex justify-between gap-4">
                <span style={{ color: 'var(--spm-t3)' }}>상품</span>
                <span className="text-right">{selectedProduct.displayName}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span style={{ color: 'var(--spm-t3)' }}>결제 방식</span>
                <span>{selectedProduct.billingCycleLabel}</span>
              </div>
              <div className="h-px" style={{ background: 'var(--spm-br2)' }} />
              <div className="flex justify-between gap-4">
                <span className="font-black">첫 결제 금액</span>
                <span className="text-[20px] font-black">{formatKrw(selectedProduct.monthlyPriceKrw)}</span>
              </div>
            </div>
          </section>

          {loading ? (
            <section className="flex h-36 items-center justify-center rounded-[20px]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
              <Loader2 size={22} className="animate-spin" color="var(--spm-t3)" />
            </section>
          ) : activePaid ? (
            <section className="rounded-[20px] p-5 text-center" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
              <CheckCircle2 size={44} color="var(--spm-grn)" className="mx-auto" />
              <h2 className="mt-3 text-[18px] font-black">현재 이용권 사용 중</h2>
              <p className="mt-2 text-[13px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>
                {activePlanLabel} 이용권이 활성화되어 있어 중복 결제를 시작할 수 없습니다.
              </p>
              <Link href="/spokedu-master/subscription" className="mt-4 flex h-11 items-center justify-center rounded-[12px] text-[13px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
                이용권 상태 보기
              </Link>
            </section>
          ) : !isAuthed ? (
            <section className="space-y-3 rounded-[20px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
              <h2 className="text-[15px] font-black">이메일로 계속하기</h2>
              {!otpSent ? (
                <>
                  <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="이메일 주소" className="h-12 w-full rounded-[12px] border px-3 text-[14px] font-semibold outline-none" style={{ background: 'var(--spm-s3)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }} />
                  <button type="button" onClick={() => void sendOtp()} disabled={working} className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] text-[14px] font-black text-white disabled:opacity-60" style={{ background: 'var(--spm-acc)' }}>
                    {working ? <Loader2 size={16} className="animate-spin" /> : <Mail size={15} />}
                    인증 코드 받기
                  </button>
                </>
              ) : (
                <>
                  <input value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))} inputMode="numeric" maxLength={6} placeholder="인증 코드 6자리" className="h-12 w-full rounded-[12px] border px-3 text-center text-[20px] font-black outline-none" style={{ background: 'var(--spm-s3)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }} />
                  <button type="button" onClick={() => void verifyOtp()} disabled={working} className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] text-[14px] font-black text-white disabled:opacity-60" style={{ background: 'var(--spm-acc)' }}>
                    {working ? <Loader2 size={16} className="animate-spin" /> : null}
                    인증 확인
                  </button>
                </>
              )}
            </section>
          ) : (
            <section className="space-y-3 rounded-[20px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
              <p className="text-[13px] font-black">{email}</p>
              <button type="button" onClick={startBillingAuth} disabled={working} className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] text-[14px] font-black text-white disabled:opacity-60" style={{ background: 'var(--spm-acc)' }}>
                {working ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                결제수단 등록하고 첫 결제 진행
              </button>
            </section>
          )}

          {error ? (
            <p className="rounded-[12px] p-3 text-[12px] font-bold" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.22)', color: 'var(--spm-red)' }}>
              {error}
            </p>
          ) : null}
        </aside>
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
