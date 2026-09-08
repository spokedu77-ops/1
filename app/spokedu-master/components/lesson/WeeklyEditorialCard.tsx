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
  cleanSquareMedia = false,
}: {
  title: string;
  heroImageUrl?: string | null;
  category: string;
  supportMeta?: string;
  hasVideo: boolean;
  onPreview: () => void;
  priority?: boolean;
  sizes?: string;
  cleanSquareMedia?: boolean;
}) {
  const type = category.trim();
  const support = (supportMeta ?? '').trim();

  return (
    <article data-weekly-editorial="" className="group min-w-0 w-full">
      <button
        type="button"
        onClick={onPreview}
        className="flex w-full cursor-pointer flex-col items-stretch overflow-hidden rounded-[16px] border border-slate-100/80 bg-white text-left transition-colors duration-200 hover:border-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--spm-acc)]"
        aria-label={`${title} 미리보기`}
      >
        <span className="relative block w-full">
          {heroImageUrl ? (
            <InstructionalThumb
              src={heroImageUrl}
              sizes={sizes}
              priority={priority}
              presentation={cleanSquareMedia ? 'home-clean-square' : 'default'}
              className="rounded-b-none transition-transform duration-200 group-hover:scale-[1.015]"
            />
          ) : (
            <span className={`relative flex w-full items-center justify-center overflow-hidden rounded-t-[15px] bg-slate-200 transition-transform duration-200 group-hover:scale-[1.015] ${cleanSquareMedia ? 'aspect-square' : 'aspect-[4/3]'}`}>
              <CategoryIcon category={category} size={36} color="rgba(15,23,42,0.45)" />
            </span>
          )}
          {hasVideo ? (
            <span className="pointer-events-none absolute left-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-white/75 text-slate-950/70">
              <Play className="h-3 w-3 fill-current" aria-hidden />
            </span>
          ) : null}
        </span>
        <div className="px-3 pb-3.5 pt-2.5">
          {type ? <span className={`${MV_META} block`}>{type}</span> : null}
          <span className={`${MV_CONTENT_TITLE} mt-0.5 block min-h-[3.1rem] line-clamp-2 transition-colors duration-200 group-hover:text-slate-700`}>{title}</span>
          {support ? <span className={`${MV_META} mt-1.5 block text-slate-600`}>{support}</span> : null}
        </div>
      </button>
    </article>
  );
}
