'use client';

import { siteBtnPrimary } from '../lib/ui-classes';

export type LandingAnchorNavItem = {
  href: string;
  label: string;
};

type LandingAnchorNavProps = {
  items: readonly LandingAnchorNavItem[];
  cta?: LandingAnchorNavItem;
  ariaLabel?: string;
};

/** 서브 랜딩용 sticky 앵커 내비 — 고정 사이트 헤더(z-40) 바로 아래 */
export function LandingAnchorNav({
  items,
  cta,
  ariaLabel = '페이지 바로가기',
}: LandingAnchorNavProps) {
  return (
    <nav
      aria-label={ariaLabel}
      className="sticky top-[calc(3.75rem+env(safe-area-inset-top,0px))] z-30 border-b border-slate-200/90 bg-white/95 backdrop-blur-md sm:top-[calc(4.25rem+env(safe-area-inset-top,0px))]"
    >
      <div className="mx-auto flex w-full max-w-6xl items-center gap-2 overflow-x-auto px-4 py-2.5 sm:px-6 lg:px-8">
        <ul className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
          {items.map((item) => (
            <li key={item.href} className="shrink-0">
              <a
                href={item.href}
                className="inline-flex min-h-9 items-center rounded-full px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
        {cta ? (
          <a href={cta.href} className={`${siteBtnPrimary} !min-h-9 shrink-0 !px-4 !py-2 text-sm`}>
            {cta.label}
          </a>
        ) : null}
      </div>
    </nav>
  );
}
