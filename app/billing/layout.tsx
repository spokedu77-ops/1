'use client';

import { LanguageSwitcher } from '@/app/components/LanguageSwitcher';

/**
 * /billing 은 /spokedu-master/subscription 으로 리다이렉트된다.
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
