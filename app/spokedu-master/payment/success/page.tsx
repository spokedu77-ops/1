'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Home, Loader2, Mail } from 'lucide-react';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { MASTER_PRODUCT_CATALOG, MASTER_CUSTOMER_SERVICE_HREF } from '../../lib/productCatalog';
import { useMasterStore } from '../../store';

type PaidPlanId = 'lite' | 'premium';
type ConfirmationStatus =
  | 'checking'
  | 'checking-access'
  | 'success'
  | 'delayed'
  | 'access-failed'
  | 'invalid'
  | 'failed';

type BillingIssueResponse = {
  ok?: boolean;
  plan?: string;
  periodEnd?: string | null;
  nextBillingAt?: string | null;
};

const ACCESS_POLL_ATTEMPTS = 6;
const ACCESS_POLL_INTERVAL_MS = 800;

function sleep(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function isPaidPlanId(value: string | null): value is PaidPlanId {
  return value === 'lite' || value === 'premium';
}

function formatDate(value: string | null | undefined) {
  if (!value) return '확인 중';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '확인 중';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

function PaymentStatusShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5" style={{ background: 'var(--spm-bg)', color: 'var(--spm-t)', fontFamily: 'var(--spm-font-body)' }}>
      <div className="w-full max-w-[460px] space-y-6 text-center">{children}</div>
    </div>
  );
}

function SuccessContent() {
  const params = useSearchParams();
  const plan = params.get('plan');
  const authKey = params.get('authKey')?.trim() ?? '';
  const customerKey = params.get('customerKey')?.trim() ?? '';
  const hasValidParams = isPaidPlanId(plan) && authKey.length > 0 && customerKey.length > 0;
  const syncSubscription = useMasterStore((state) => state.syncSubscription);
  const confirmationStarted = useRef(false);
  const [status, setStatus] = useState<ConfirmationStatus>(hasValidParams ? 'checking' : 'invalid');
  const [accessAttempt, setAccessAttempt] = useState(0);
  const [result, setResult] = useState<BillingIssueResponse | null>(null);

  const checkAccessActivation = useCallback(async () => {
    setStatus('checking-access');

    for (let attempt = 1; attempt <= ACCESS_POLL_ATTEMPTS; attempt += 1) {
      setAccessAttempt(attempt);
      await syncSubscription().catch(() => undefined);

      let response: Response;
      try {
        response = await fetch('/api/spokedu-master/access', { cache: 'no-store' });
      } catch {
        setStatus('access-failed');
        return;
      }

      if (response.status >= 500) {
        setStatus('access-failed');
        return;
      }

      const access = await response.json().catch(() => null) as { allowed?: boolean } | null;
      if (response.ok && access?.allowed === true) {
        setStatus('success');
        return;
      }

      if (attempt < ACCESS_POLL_ATTEMPTS) {
        await sleep(ACCESS_POLL_INTERVAL_MS);
      }
    }

    setStatus('delayed');
  }, [syncSubscription]);

  useEffect(() => {
    if (!hasValidParams || confirmationStarted.current || !isPaidPlanId(plan)) return;
    confirmationStarted.current = true;

    const issueBilling = async () => {
      try {
        const response = await fetch('/api/spokedu-master/payment/billing/issue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId: plan, authKey, customerKey }),
        });
        const json = await response.json().catch(() => null) as BillingIssueResponse | null;

        if (!response.ok || json?.ok !== true) {
          setStatus('failed');
          return;
        }

        setResult(json);
        await checkAccessActivation();
      } catch {
        setStatus('failed');
      }
    };

    void issueBilling();
  }, [authKey, checkAccessActivation, customerKey, hasValidParams, plan]);

  if (status === 'checking' || status === 'checking-access') {
    return (
      <PaymentStatusShell>
        <Loader2 size={58} className="mx-auto animate-spin" color="var(--spm-acc)" strokeWidth={1.7} />
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-acc)' }}>Billing Activation</p>
          <h1 className="mt-2 text-[30px] font-black" style={{ fontFamily: 'var(--spm-font-display)' }}>
            {status === 'checking-access' ? '구독 활성화를 확인하고 있습니다' : '첫 결제를 진행하고 있습니다'}
          </h1>
          <p className="mt-3 text-[15px] font-semibold leading-6" style={{ color: 'var(--spm-t2)' }}>
            {status === 'checking-access'
              ? `첫 결제가 승인되었습니다. 이용권 접근 권한을 확인합니다. (${accessAttempt}/${ACCESS_POLL_ATTEMPTS})`
              : '결제수단 인증 결과로 첫 자동결제를 승인하는 중입니다. 완료 전에는 이용권이 활성화되지 않습니다.'}
          </p>
        </div>
      </PaymentStatusShell>
    );
  }

  if (status === 'success') {
    const activePlan = isPaidPlanId(result?.plan ?? null) ? result?.plan as PaidPlanId : plan as PaidPlanId;
    const product = MASTER_PRODUCT_CATALOG[activePlan];
    return (
      <PaymentStatusShell>
        <CheckCircle2 size={66} color="var(--spm-grn)" strokeWidth={1.5} className="mx-auto" />
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-grn)' }}>Subscription Active</p>
          <h1 className="mt-2 text-[30px] font-black" style={{ fontFamily: 'var(--spm-font-display)' }}>
            구독 시작 완료
          </h1>
          <p className="mt-3 text-[15px] font-semibold leading-6" style={{ color: 'var(--spm-t2)' }}>
            첫 결제와 구독 활성화가 완료되었습니다.
          </p>
        </div>
        <dl className="grid gap-2 rounded-[18px] p-4 text-left" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <div className="flex justify-between gap-4 text-[13px] font-semibold">
            <dt style={{ color: 'var(--spm-t3)' }}>현재 이용권</dt>
            <dd>{product.displayName}</dd>
          </div>
          <div className="flex justify-between gap-4 text-[13px] font-semibold">
            <dt style={{ color: 'var(--spm-t3)' }}>월 결제 금액</dt>
            <dd>{product.monthlyPriceKrw?.toLocaleString('ko-KR')}원</dd>
          </div>
          <div className="flex justify-between gap-4 text-[13px] font-semibold">
            <dt style={{ color: 'var(--spm-t3)' }}>다음 결제 예정일</dt>
            <dd>{formatDate(result?.nextBillingAt ?? result?.periodEnd)}</dd>
          </div>
        </dl>
        <div className="grid gap-3">
          <Link href="/spokedu-master/dashboard" className="flex h-12 items-center justify-center rounded-[12px] text-[14px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
            SPOKEDU MASTER 시작하기
          </Link>
          <Link href="/spokedu-master/subscription" className="flex h-11 items-center justify-center rounded-[12px] text-[13px] font-black" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}>
            이용권 상태 화면
          </Link>
        </div>
      </PaymentStatusShell>
    );
  }

  if (status === 'delayed' || status === 'access-failed') {
    return (
      <PaymentStatusShell>
        <AlertCircle size={64} color="var(--spm-acc)" strokeWidth={1.5} className="mx-auto" />
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-acc)' }}>Access Check Pending</p>
          <h1 className="mt-2 text-[30px] font-black" style={{ fontFamily: 'var(--spm-font-display)' }}>
            이용권 반영을 다시 확인해 주세요
          </h1>
          <p className="mt-3 text-[15px] font-semibold leading-6" style={{ color: 'var(--spm-t2)' }}>
            첫 결제는 처리되었지만 접근 권한 확인이 지연되고 있습니다. 결제를 반복하지 말고 이용권 상태만 다시 확인해 주세요.
          </p>
        </div>
        <button type="button" onClick={() => void checkAccessActivation()} className="flex h-12 w-full items-center justify-center rounded-[12px] text-[14px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
          이용권 다시 확인
        </button>
      </PaymentStatusShell>
    );
  }

  return (
    <PaymentStatusShell>
      <AlertCircle size={64} color="var(--spm-red)" strokeWidth={1.5} className="mx-auto" />
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-red)' }}>
          {status === 'invalid' ? 'Invalid Billing Auth' : 'Billing Failed'}
        </p>
        <h1 className="mt-2 text-[30px] font-black" style={{ fontFamily: 'var(--spm-font-display)' }}>
          결제를 완료하지 못했습니다.
        </h1>
        <p className="mt-3 text-[15px] font-semibold leading-6" style={{ color: 'var(--spm-t2)' }}>
          결제수단을 확인한 뒤 다시 시도해 주세요. 완료 전에는 유료 권한이 부여되지 않습니다.
        </p>
      </div>
      <div className="grid gap-3">
        <Link href={`/spokedu-master/payment?plan=${isPaidPlanId(plan) ? plan : 'premium'}`} className="flex h-12 items-center justify-center rounded-[12px] text-[14px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
          다시 시도
        </Link>
        <a href={MASTER_CUSTOMER_SERVICE_HREF} className="flex h-11 items-center justify-center gap-2 rounded-[12px] text-[13px] font-black" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}>
          <Mail size={15} />
          문의하기
        </a>
        <Link href="/spokedu-master/dashboard" className="flex h-11 items-center justify-center gap-2 rounded-[12px] text-[13px] font-black" style={{ background: 'transparent', border: '1px solid var(--spm-br2)', color: 'var(--spm-t2)' }}>
          <Home size={15} />
          홈으로 이동
        </Link>
      </div>
    </PaymentStatusShell>
  );
}

function CheckingFallback() {
  return (
    <PaymentStatusShell>
      <Loader2 size={58} className="mx-auto animate-spin" color="var(--spm-acc)" strokeWidth={1.7} />
      <p className="text-[15px] font-semibold" style={{ color: 'var(--spm-t2)' }}>결제 정보를 확인하고 있습니다.</p>
    </PaymentStatusShell>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<CheckingFallback />}>
      <SuccessContent />
    </Suspense>
  );
}
