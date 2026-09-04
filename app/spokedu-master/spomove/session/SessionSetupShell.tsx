'use client';

import type { ReactNode } from 'react';

export function SessionSetupShell({
  programLabel,
  displayTitle,
  children,
  compact = false,
}: {
  programLabel: string;
  displayTitle: string;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className="flex min-h-min w-full justify-center px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[calc(4.75rem+env(safe-area-inset-top))] sm:px-8 [@media(max-height:950px)]:pb-3 [@media(max-height:950px)]:pt-[calc(4.25rem+env(safe-area-inset-top))]">
      <section className={`w-full border-white/10 ${compact ? 'max-w-[520px]' : 'max-w-[560px]'}`}>
        <div className="px-1 pt-2 sm:px-2">
          <p className="text-[12px] font-medium text-white/55">{programLabel}</p>
          <h1 className="mt-2 text-[24px] font-semibold leading-tight text-white sm:text-[28px]">{displayTitle}</h1>
        </div>
        <div className={`px-1 pb-6 sm:px-2 ${compact ? 'pt-4' : 'pt-5'}`}>{children}</div>
      </section>
    </div>
  );
}
