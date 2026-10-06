'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { MV_HOME_CARD_ACTION, MV_HOME_CARD_KICKER, MV_HOME_CARD_META, MV_HOME_CARD_TITLE } from '../lib/masterUiClasses';
import { getDashboardDisplayTitle } from './dashboardDisplayTitle';

export function HomeContinueCard({ media, mediaSize = 'default', kicker, title, meta, actionLabel, href }: {
  media: ReactNode;
  mediaSize?: 'default' | 'compact';
  kicker: string;
  title: string;
  meta?: string;
  actionLabel: string;
  href: string;
}) {
  return (
    <article data-dashboard-operational-card="true" className="flex h-full w-full min-w-0 items-center gap-3 rounded-[16px] border border-slate-200/80 bg-white p-3">
      <div className={`${mediaSize === 'compact' ? 'h-16 w-16' : 'h-[72px] w-[72px] min-[768px]:h-20 min-[768px]:w-20'} shrink-0 overflow-hidden rounded-[12px] bg-slate-100`}>{media}</div>
      <div className="flex min-w-0 flex-1 flex-col self-stretch">
        <p className={MV_HOME_CARD_KICKER}>{kicker}</p>
        <h3 className={`${MV_HOME_CARD_TITLE} mt-0.5 line-clamp-2`}>{getDashboardDisplayTitle(title)}</h3>
        {meta ? <p data-dashboard-operational-meta="true" className={`${MV_HOME_CARD_META} mt-1 whitespace-nowrap`}>{meta}</p> : null}
        <Link href={href} data-dashboard-operational-cta="true" className={`${MV_HOME_CARD_ACTION} mt-2 inline-flex min-h-11 w-fit items-center gap-1 transition-colors hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--spm-acc)] min-[768px]:mt-auto`}>
          {actionLabel}<ArrowRight size={15} aria-hidden />
        </Link>
      </div>
    </article>
  );
}
