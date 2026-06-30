'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, CreditCard, Home, XCircle } from 'lucide-react';
import { Suspense } from 'react';

function normalizePlan(value: string | null) {
  return value === 'lite' || value === 'premium' ? value : 'premium';
}

function CancelContent() {
  const params = useSearchParams();
  const retryPlan = normalizePlan(params.get('plan'));

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5" style={{ background: 'var(--spm-bg)', color: 'var(--spm-t)', fontFamily: 'var(--spm-font-body)' }}>
      <div className="w-full max-w-[430px] space-y-6 text-center">
        <XCircle size={64} color="var(--spm-t3)" strokeWidth={1.5} className="mx-auto" />
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>Billing Auth Canceled</p>
          <h1 className="mt-2 text-[30px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>
            결제를 완료하지 못했습니다.
          </h1>
          <p className="mt-3 text-[15px] font-semibold leading-6" style={{ color: 'var(--spm-t2)' }}>
            결제수단 인증이 취소되어 구독이 활성화되지 않았습니다. 결제수단을 확인한 뒤 다시 시도해 주세요.
          </p>
        </div>
        <div className="space-y-3">
          <Link href={`/spokedu-master/payment?plan=${retryPlan}`} className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] text-[14px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
            <CreditCard size={16} />
            다시 시도
          </Link>
          <Link href="/spokedu-master/subscription" className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] text-[13px] font-black" style={{ background: 'transparent', border: '1px solid var(--spm-br2)', color: 'var(--spm-t2)' }}>
            <ArrowLeft size={15} />
            이용권 선택으로 돌아가기
          </Link>
          <Link href="/spokedu-master/dashboard" className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] text-[14px] font-black" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}>
            <Home size={16} />
            홈으로 이동
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PaymentCancelPage() {
  return (
    <Suspense>
      <CancelContent />
    </Suspense>
  );
}
