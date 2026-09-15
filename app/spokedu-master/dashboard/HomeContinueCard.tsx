'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { MV_HOME_CARD_ACTION, MV_HOME_CARD_KICKER, MV_HOME_CARD_META, MV_HOME_CARD_TITLE } from '../lib/masterUiClasses';

export function HomeContinueCard({ media, mediaSize = 'default', kicker, title, meta, actionLabel, href }: {
  media: ReactNode;
  mediaSize?: 'default' | 'compact';
  kicker: string;
  title: string;
  meta: string;
  actionLabel: string;
  href: string;
}) {
  return (
    <article className="flex h-[108px] w-[86vw] max-w-[360px] shrink-0 snap-start items-center gap-3 rounded-[15px] border border-slate-200/80 bg-white p-3 lg:w-auto lg:max-w-none">
      <div className={`${mediaSize === 'compact' ? 'h-16 w-16' : 'h-20 w-20'} shrink-0 overflow-hidden rounded-[12px] bg-slate-100`}>{media}</div>
      <div className="flex min-w-0 flex-1 flex-col justify-center self-stretch">
        <p className={MV_HOME_CARD_KICKER}>{kicker}</p>
        <h3 className={`${MV_HOME_CARD_TITLE} line-clamp-1`}>{title}</h3>
        <p className={`${MV_HOME_CARD_META} mt-0.5 line-clamp-1`}>{meta}</p>
        <Link href={href} className={`${MV_HOME_CARD_ACTION} mt-auto inline-flex min-h-7 w-fit items-center gap-1 transition-colors hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--spm-acc)]`}>
          {actionLabel}<ArrowRight size={15} aria-hidden />
        </Link>
      </div>
    </article>
  );
}
