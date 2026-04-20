'use client';

import { LanguageSwitcher } from '@/app/components/LanguageSwitcher';

/**
 * /billing 은 대부분 /spokedu-pro 로 리다이렉트되지만,
 * 계획상 구독(결제) 경로에도 언어 스위처를 둘 수 있도록 최소 셸만 둔다.
 */
export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-auto absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10">
        <LanguageSwitcher className="shadow-sm" />
      </div>
      {children}
    </div>
  );
}
