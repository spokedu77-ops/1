'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CreditCard, MessageCircle, XCircle } from 'lucide-react';
import { Suspense, useMemo } from 'react';
import { MASTER_CUSTOMER_SERVICE_HREF } from '../../lib/productCatalog';
import { readMasterGateContextFromSearchParams } from '../../lib/masterGateIntent';

function normalizePlan(value: string | null) {
  return value === 'lite' || value === 'premium' ? value : 'premium';
}

function CancelContent() {
  const params = useSearchParams();
  const gateContext = useMemo(() => readMasterGateContextFromSearchParams(params), [params]);
  const retryPlan = normalizePlan(params.get('plan'));
  const supportHref = MASTER_CUSTOMER_SERVICE_HREF;
  const retryHref = useMemo(() => {
    const directRetryHref = `/spokedu-lab/payment?plan=${retryPlan}`;
    const retryParams = new URLSearchParams({
      plan: retryPlan,
    });
    if (gateContext.mode === 'gated' && gateContext.intent) {
      retryParams.set('intent', gateContext.intent);
      retryParams.set('next', gateContext.next);
      retryParams.set('journeyId', gateContext.journeyId);
      if (gateContext.gateSurface) retryParams.set('gateSurface', gateContext.gateSurface);
    }
    return gateContext.mode === 'gated' ? `/spokedu-lab/payment?${retryParams.toString()}` : directRetryHref;
  }, [gateContext, retryPlan]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5" style={{ background: 'var(--spm-bg)', color: 'var(--spm-t)', fontFamily: 'var(--spm-font-body)' }}>
      <div className="w-full max-w-[430px] space-y-6 text-center">
        <XCircle size={64} color="var(--spm-t3)" strokeWidth={1.5} className="mx-auto" />
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>결제 취소</p>
          <h1 className="mt-2 text-[30px] font-extrabold" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>
            결제를 완료하지 못했습니다
          </h1>
          <p className="mt-3 text-[15px] font-semibold leading-6" style={{ color: 'var(--spm-t2)' }}>
            결제 인증이 취소되었거나 처리 중 오류가 발생했습니다. 구독은 활성화되지 않았습니다.
          </p>
          <p className="mt-2 text-[12px] font-semibold leading-5" style={{ color: 'var(--spm-t3)' }}>
            문의할 때는 로그인한 이메일, 발생 시각, 선택한 플랜과 화면의 오류 내용만 알려주세요. 결제키나 카드 정보는 보내지 마세요.
          </p>
        </div>
        <div className="space-y-3">
          <Link href={retryHref} className="spm-btn-primary flex h-12 w-full items-center justify-center gap-2 rounded-[12px] text-[14px] font-extrabold focus-visible:outline-none">
            <CreditCard size={16} />
            다시 시도
          </Link>
          <a href={supportHref} target="_blank" rel="noopener noreferrer" className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] text-[13px] font-extrabold" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}>
            <MessageCircle size={15} />
            카카오톡 고객센터
          </a>
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
