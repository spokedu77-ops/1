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
    <div className="flex min-h-dvh w-full items-start justify-center px-4 pb-2 pt-[calc(3.75rem+env(safe-area-inset-top))] sm:px-8">
      <section className={`w-full border-white/10 ${compact ? 'max-w-[520px]' : 'max-w-[560px]'} [@media(max-height:758px)]:w-[135.135%] [@media(max-height:758px)]:max-w-[756px] [@media(max-height:758px)]:[zoom:0.74]`}>
        <div className="px-1 pt-0 sm:px-2">
          <p className="text-[12px] font-medium text-white/55">{programLabel}</p>
          <h1 className="mt-1 text-[21px] font-semibold leading-tight text-white">{displayTitle}</h1>
        </div>
        <div className="px-1 pb-3 pt-3 sm:px-2">{children}</div>
      </section>
    </div>
  );
}
