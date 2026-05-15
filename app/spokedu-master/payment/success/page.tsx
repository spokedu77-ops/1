'use client';

import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMasterStore } from '../../store';

function SuccessContent() {
  const params = useSearchParams();
  const sessionId = params.get('session_id');
  const syncSubscription = useMasterStore((state) => state.syncSubscription);

  useEffect(() => {
    void syncSubscription();
  }, [syncSubscription]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-[22px]" style={{ background: 'var(--spm-bg)', color: 'var(--spm-t)', fontFamily: 'var(--spm-font-body)' }}>
      <div className="w-full max-w-[400px] space-y-6 text-center">
        <div className="grid place-items-center">
          <CheckCircle2 size={64} color="var(--spm-grn)" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-[28px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>결제 완료</h1>
          <p className="mt-3 text-[15px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>플랜이 활성화되었습니다. 라이브러리와 SPOMOVE를 바로 사용할 수 있습니다.</p>
        </div>
        {sessionId ? (
          <p className="text-[10px] font-bold" style={{ color: 'var(--spm-t3)' }}>
            주문 번호: {sessionId.slice(0, 24)}…
          </p>
        ) : null}
        <div className="space-y-3">
          <Link
            href="/spokedu-master/library"
            className="flex h-12 w-full items-center justify-center rounded-[12px] text-[14px] font-black text-white"
            style={{ background: 'var(--spm-acc)' }}
          >
            라이브러리 바로가기
          </Link>
          <Link
            href="/spokedu-master/profile"
            className="block text-[12px] font-semibold"
            style={{ color: 'var(--spm-t3)' }}
          >
            내 정보에서 구독 확인
          </Link>
        </div>
        <p className="text-[10px] leading-5" style={{ color: 'var(--spm-t3)' }}>
          Stripe 보안 결제 · 언제든지 취소 가능 · 문의: <a href="mailto:support@spokedu.com" style={{ color: 'var(--spm-acc)' }}>support@spokedu.com</a>
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
