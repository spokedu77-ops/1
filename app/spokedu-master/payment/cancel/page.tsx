'use client';

import Link from 'next/link';
import { ArrowLeft, XCircle } from 'lucide-react';

export default function PaymentCancelPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-[22px]" style={{ background: 'var(--spm-bg)', color: 'var(--spm-t)', fontFamily: 'var(--spm-font-body)' }}>
      <div className="w-full max-w-[400px] space-y-6 text-center">
        <div className="grid place-items-center">
          <XCircle size={64} color="var(--spm-t3)" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-[28px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>결제 취소됨</h1>
          <p className="mt-3 text-[15px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>결제가 완료되지 않았습니다. 다시 시도하거나 체험을 계속 이용하세요.</p>
        </div>
        <div className="space-y-3">
          <Link
            href="/spokedu-master/payment?plan=pro"
            className="flex h-12 w-full items-center justify-center rounded-[12px] text-[14px] font-black text-white"
            style={{ background: 'var(--spm-acc)' }}
          >
            다시 시도하기
          </Link>
          <Link
            href="/spokedu-master/library"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] text-[14px] font-black"
            style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}
          >
            <ArrowLeft size={16} />
            라이브러리로 돌아가기
          </Link>
        </div>
        <p className="text-[11px]" style={{ color: 'var(--spm-t3)' }}>
          문의: <a href="mailto:support@spokedu.com" style={{ color: 'var(--spm-acc)' }}>support@spokedu.com</a>
        </p>
      </div>
    </div>
  );
}
