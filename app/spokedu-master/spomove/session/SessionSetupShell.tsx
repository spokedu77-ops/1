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
    <div className="flex min-h-min w-full justify-center px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[calc(4.75rem+env(safe-area-inset-top))] sm:px-8">
      <section className={`w-full rounded-[28px] border border-white/10 bg-white/[0.06] shadow-[0_28px_90px_rgba(0,0,0,0.38)] backdrop-blur-xl ${compact ? 'max-w-[520px]' : 'max-w-[560px]'}`}>
        <div className="px-5 pt-6 sm:px-7 sm:pt-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-black text-white/70">
              {programLabel}
            </span>
          </div>
          <h1 className="mt-3 text-[26px] font-black leading-tight text-white sm:text-[32px]">{displayTitle}</h1>
        </div>
        <div className={`px-5 pb-6 sm:px-7 sm:pb-8 ${compact ? 'pt-4' : 'pt-5'}`}>{children}</div>
      </section>
    </div>
  );
}
