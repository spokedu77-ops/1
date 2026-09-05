'use client';

import { Play } from 'lucide-react';

import { InstructionalThumb } from '../media/InstructionalThumb';
import { MV_CONTENT_TITLE, MV_META } from '../../lib/masterUiClasses';
import { CategoryIcon } from '../ui/ProgramThumb';

export function WeeklyEditorialCard({
  title,
  heroImageUrl,
  category,
  supportMeta,
  hasVideo,
  onPreview,
  priority = false,
  sizes = '(min-width: 1280px) 250px, (min-width: 768px) 45vw, 82vw',
}: {
  title: string;
  heroImageUrl?: string | null;
  category: string;
  supportMeta?: string;
  hasVideo: boolean;
  onPreview: () => void;
  priority?: boolean;
  sizes?: string;
}) {
  const type = category.trim();
  const support = (supportMeta ?? '').trim();

  return (
    <article data-weekly-editorial="" className="min-w-0 w-full">
      <button
        type="button"
        onClick={onPreview}
        className="flex w-full flex-col items-stretch text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--spm-acc)]"
        aria-label={`${title} 미리보기`}
      >
        <span className="relative block w-full">
          {heroImageUrl ? (
            <InstructionalThumb
              src={heroImageUrl}
              sizes={sizes}
              priority={priority}
              className="lg:aspect-auto lg:h-56"
            />
          ) : (
            <span className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-[16px] bg-slate-200 lg:aspect-auto lg:h-56">
              <CategoryIcon category={category} size={36} color="rgba(15,23,42,0.45)" />
            </span>
          )}
          {hasVideo ? (
            <span className="pointer-events-none absolute left-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-white/75 text-slate-950/70">
              <Play className="h-3 w-3 fill-current" aria-hidden />
            </span>
          ) : null}
        </span>
        {type ? <span className={`${MV_META} mt-2.5 block`}>{type}</span> : null}
        <span className={`${MV_CONTENT_TITLE} mt-1 block line-clamp-2`}>{title}</span>
        {support ? <span className={`${MV_META} mt-2 block`}>{support}</span> : null}
      </button>
    </article>
  );
}
