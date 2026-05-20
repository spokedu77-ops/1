'use client';

import Link from 'next/link';
import { CheckCircle2, FileText, MonitorPlay } from 'lucide-react';
import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMasterStore } from '../../store';

function SuccessContent() {
  const params = useSearchParams();
  const paymentKey = params.get('paymentKey');
  const orderId = params.get('orderId');
  const amount = params.get('amount');
  const syncSubscription = useMasterStore((state) => state.syncSubscription);

  useEffect(() => {
    if (paymentKey && orderId && amount) {
      void fetch('/api/spokedu-master/payment/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
      }).then(() => syncSubscription());
    } else {
      void syncSubscription();
    }
  }, [paymentKey, orderId, amount, syncSubscription]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5" style={{ background: 'var(--spm-bg)', color: 'var(--spm-t)', fontFamily: 'var(--spm-font-body)' }}>
      <div className="w-full max-w-[460px] space-y-6 text-center">
        <div className="grid place-items-center">
          <CheckCircle2 size={66} color="var(--spm-grn)" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-grn)' }}>Payment Complete</p>
          <h1 className="mt-2 text-[30px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>
            구독이 시작되었습니다
          </h1>
          <p className="mt-3 text-[15px] font-semibold leading-6" style={{ color: 'var(--spm-t2)' }}>
            이제 라이브러리에서 수업을 고르고, SPOMOVE 큰 화면으로 바로 실행할 수 있습니다.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/spokedu-master/library"
            className="flex h-12 items-center justify-center rounded-[12px] text-[14px] font-black text-white"
            style={{ background: 'var(--spm-acc)' }}
          >
            라이브러리 시작하기
          </Link>
          <Link
            href="/spokedu-master/spomove/session"
            className="flex h-12 items-center justify-center gap-2 rounded-[12px] text-[14px] font-black"
            style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}
          >
            <MonitorPlay size={16} />
            큰 화면 실행
          </Link>
        </div>

        <Link
          href="/spokedu-master/report"
          className="mx-auto flex h-11 max-w-[260px] items-center justify-center gap-2 rounded-[12px] text-[13px] font-black"
          style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t2)' }}
        >
          <FileText size={15} />
          수업 설명 도구 보기
        </Link>

        {orderId ? (
          <p className="text-[10px] font-bold" style={{ color: 'var(--spm-t3)' }}>
            주문 번호: {orderId}
          </p>
        ) : null}

        <p className="text-[10px] leading-5" style={{ color: 'var(--spm-t3)' }}>
          결제·환불 문의: <a href="mailto:support@spokedu.com" style={{ color: 'var(--spm-acc)' }}>support@spokedu.com</a>
        </p>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
