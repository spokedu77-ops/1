'use client';

import Link from 'next/link';
import { AlertCircle, CheckCircle2, CreditCard, Home, Loader2, Mail } from 'lucide-react';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMasterStore } from '../../store';

type ConfirmationStatus =
  | 'checking'
  | 'checking-access'
  | 'success'
  | 'delayed'
  | 'access-failed'
  | 'invalid'
  | 'failed';

const ACCESS_POLL_ATTEMPTS = 6;
const ACCESS_POLL_INTERVAL_MS = 800;

function sleep(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function PaymentStatusShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center px-5"
      style={{ background: 'var(--spm-bg)', color: 'var(--spm-t)', fontFamily: 'var(--spm-font-body)' }}
    >
      <div className="w-full max-w-[460px] space-y-6 text-center">{children}</div>
    </div>
  );
}

function SuccessContent() {
  const params = useSearchParams();
  const paymentKey = params.get('paymentKey')?.trim() ?? '';
  const orderId = params.get('orderId')?.trim() ?? '';
  const amountParam = params.get('amount')?.trim() ?? '';
  const amount = Number(amountParam);
  const hasValidParams =
    paymentKey.length > 0 &&
    orderId.length > 0 &&
    /^\d+$/.test(amountParam) &&
    Number.isSafeInteger(amount) &&
    amount > 0;
  const retryPlan = orderId.startsWith('spm-team-') ? 'team' : 'pro';
  const syncSubscription = useMasterStore((state) => state.syncSubscription);
  const confirmationStarted = useRef(false);
  const [status, setStatus] = useState<ConfirmationStatus>(hasValidParams ? 'checking' : 'invalid');
  const [accessAttempt, setAccessAttempt] = useState(0);

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

      const result = await response.json().catch(() => null) as { allowed?: boolean } | null;
      if (response.ok && result?.allowed === true) {
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
    if (!hasValidParams || confirmationStarted.current) return;
    confirmationStarted.current = true;

    const confirmPayment = async () => {
      try {
        const response = await fetch('/api/spokedu-master/payment/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentKey, orderId, amount }),
        });
        const result = await response.json().catch(() => null) as { ok?: boolean } | null;

        if (!response.ok || result?.ok !== true) {
          setStatus('failed');
          return;
        }

        await checkAccessActivation();
      } catch {
        setStatus('failed');
      }
    };

    void confirmPayment();
  }, [amount, checkAccessActivation, hasValidParams, orderId, paymentKey]);

  if (status === 'checking' || status === 'checking-access') {
    const checkingAccess = status === 'checking-access';
    return (
      <PaymentStatusShell>
        <div className="grid place-items-center">
          <Loader2 size={58} className="animate-spin" color="var(--spm-acc)" strokeWidth={1.7} />
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-acc)' }}>Payment Verification</p>
          <h1 className="mt-2 text-[30px] font-black" style={{ fontFamily: 'var(--spm-font-display)', letterSpacing: 0 }}>
            {checkingAccess ? '이용권 반영을 확인하고 있습니다' : '결제 정보를 확인하고 있습니다'}
          </h1>
          <p className="mt-3 text-[15px] font-semibold leading-6" style={{ color: 'var(--spm-t2)' }}>
            {checkingAccess
              ? `결제는 확인됐습니다. 운영 화면을 열기 전에 이용권 접근 권한을 다시 확인합니다. (${accessAttempt}/${ACCESS_POLL_ATTEMPTS})`
              : '결제 확인이 완료될 때까지 잠시만 기다려 주세요. 확인 전에는 이용권이 활성화되지 않습니다.'}
          </p>
        </div>
      </PaymentStatusShell>
    );
  }

  if (status === 'success') {
    return (
      <PaymentStatusShell>
        <div className="grid place-items-center">
          <CheckCircle2 size={66} color="var(--spm-grn)" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-grn)' }}>Payment Confirmed</p>
          <h1 className="mt-2 text-[30px] font-black" style={{ fontFamily: 'var(--spm-font-display)', letterSpacing: 0 }}>
            30일 이용권이 활성화되었습니다
          </h1>
          <p className="mt-3 text-[15px] font-semibold leading-6" style={{ color: 'var(--spm-t2)' }}>
            이용권 접근 권한까지 확인했습니다. 이제 수업 자료, SPOMOVE, 학생 기록, 안내문 도구를 사용할 수 있습니다.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/spokedu-master/dashboard"
            className="flex h-12 items-center justify-center rounded-[12px] text-[14px] font-black text-white"
            style={{ background: 'var(--spm-acc)' }}
          >
            SPOKEDU MASTER 시작하기
          </Link>
          <Link
            href="/spokedu-master/subscription"
            className="flex h-12 items-center justify-center rounded-[12px] text-[14px] font-black"
            style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}
          >
            이용권 상태 확인
          </Link>
        </div>

        <p className="text-[10px] leading-5" style={{ color: 'var(--spm-t3)' }}>
          결제·환불 문의: <a href="mailto:support@spokedu.com" style={{ color: 'var(--spm-acc)' }}>support@spokedu.com</a>
        </p>
      </PaymentStatusShell>
    );
  }

  if (status === 'delayed' || status === 'access-failed') {
    const accessFailed = status === 'access-failed';
    return (
      <PaymentStatusShell>
        <div className="grid place-items-center">
          <AlertCircle size={64} color="var(--spm-acc)" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-acc)' }}>Access Check Pending</p>
          <h1 className="mt-2 text-[30px] font-black" style={{ fontFamily: 'var(--spm-font-display)', letterSpacing: 0 }}>
            이용권 반영을 다시 확인해야 합니다
          </h1>
          <p className="mt-3 text-[15px] font-semibold leading-6" style={{ color: 'var(--spm-t2)' }}>
            {accessFailed
              ? '결제 확인 후 이용권 상태를 조회하지 못했습니다. 결제는 다시 시도하지 말고 이용권 확인만 다시 실행해 주세요.'
              : '결제는 확인됐지만 운영 화면 접근 권한 반영이 지연되고 있습니다. 잠시 후 다시 확인해 주세요.'}
          </p>
        </div>
        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => void checkAccessActivation()}
            className="flex h-12 items-center justify-center rounded-[12px] text-[14px] font-black text-white"
            style={{ background: 'var(--spm-acc)' }}
          >
            이용권 다시 확인
          </button>
          <a
            href="mailto:support@spokedu.com?subject=SPOKEDU%20MASTER%20%EC%9D%B4%EC%9A%A9%EA%B6%8C%20%EB%B0%98%EC%98%81%20%EB%AC%B8%EC%9D%98"
            className="flex h-11 items-center justify-center gap-2 rounded-[12px] text-[13px] font-black"
            style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}
          >
            <Mail size={15} />
            문의하기
          </a>
        </div>
      </PaymentStatusShell>
    );
  }

  const isInvalid = status === 'invalid';
  return (
    <PaymentStatusShell>
      <div className="grid place-items-center">
        <AlertCircle size={64} color="var(--spm-red)" strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-red)' }}>
          {isInvalid ? 'Invalid Payment Information' : 'Payment Verification Failed'}
        </p>
        <h1 className="mt-2 text-[30px] font-black" style={{ fontFamily: 'var(--spm-font-display)', letterSpacing: 0 }}>
          {isInvalid ? '결제 확인에 필요한 정보가 부족합니다' : '결제 확인에 실패했습니다'}
        </h1>
        <p className="mt-3 text-[15px] font-semibold leading-6" style={{ color: 'var(--spm-t2)' }}>
          {isInvalid
            ? '결제를 다시 시도하거나 문제가 계속되면 고객센터로 문의해 주세요.'
            : '이 상태에서는 이용권 확인을 진행하지 않습니다. 결제 화면에서 다시 시도해 주세요.'}
        </p>
      </div>

      <div className="grid gap-3">
        <Link
          href={`/spokedu-master/payment?plan=${retryPlan}`}
          className="flex h-12 items-center justify-center gap-2 rounded-[12px] text-[14px] font-black text-white"
          style={{ background: 'var(--spm-acc)' }}
        >
          <CreditCard size={16} />
          결제 다시 시도
        </Link>
        <div className="grid gap-3 sm:grid-cols-2">
          <a
            href="mailto:support@spokedu.com?subject=SPOKEDU%20MASTER%20%EA%B2%B0%EC%A0%9C%20%ED%99%95%EC%9D%B8%20%EB%AC%B8%EC%9D%98"
            className="flex h-11 items-center justify-center gap-2 rounded-[12px] text-[13px] font-black"
            style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}
          >
            <Mail size={15} />
            문의하기
          </a>
          <Link
            href="/spokedu-master/dashboard"
            className="flex h-11 items-center justify-center gap-2 rounded-[12px] text-[13px] font-black"
            style={{ background: 'transparent', border: '1px solid var(--spm-br2)', color: 'var(--spm-t2)' }}
          >
            <Home size={15} />
            홈으로 이동
          </Link>
        </div>
      </div>
    </PaymentStatusShell>
  );
}

function CheckingFallback() {
  return (
    <PaymentStatusShell>
      <div className="grid place-items-center">
        <Loader2 size={58} className="animate-spin" color="var(--spm-acc)" strokeWidth={1.7} />
      </div>
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
