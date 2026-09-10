'use client';

import { Bookmark, Play } from 'lucide-react';

import { InstructionalThumb } from '../media/InstructionalThumb';
import { MV_CONTENT_TITLE, MV_META } from '../../lib/masterUiClasses';
import { CategoryIcon } from '../ui/ProgramThumb';
import { LessonNewMark } from './LessonCatalogCard';

export function WeeklyEditorialCard({
  title,
  heroImageUrl,
  category,
  supportMeta,
  hasVideo,
  onPreview,
  favorite = false,
  favoriteEnabled = false,
  onFavorite,
  priority = false,
  sizes = '(min-width: 1280px) 250px, (min-width: 768px) 45vw, 82vw',
  cleanSquareMedia = false,
  isNew = false,
}: {
  title: string;
  heroImageUrl?: string | null;
  category: string;
  supportMeta?: string;
  hasVideo: boolean;
  onPreview: () => void;
  favorite?: boolean;
  favoriteEnabled?: boolean;
  onFavorite?: () => void;
  priority?: boolean;
  sizes?: string;
  cleanSquareMedia?: boolean;
  isNew?: boolean;
}) {
  const type = category.trim();
  const support = (supportMeta ?? '').trim();

  return (
    <article data-weekly-editorial="" className="group relative min-w-0 w-full">
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
          {isNew || hasVideo ? (
            <span className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5">
              {isNew ? <LessonNewMark /> : null}
              {hasVideo ? (
                <span className="grid h-7 w-7 place-items-center rounded-full bg-white/75 text-slate-950/70">
                  <Play className="h-3 w-3 fill-current" aria-hidden />
                </span>
              ) : null}
            </span>
          ) : null}
        </span>
        <div className="px-3 pb-3.5 pt-2.5">
          {type ? <span className={`${MV_META} block`}>{type}</span> : null}
          <span className={`${MV_CONTENT_TITLE} mt-1.5 block line-clamp-1 transition-colors duration-200 group-hover:text-slate-700`}>{title}</span>
          {support ? <span className={`${MV_META} mt-3 block text-slate-600`}>{support}</span> : null}
        </div>
      </button>

      {onFavorite ? (
        <button
          type="button"
          onClick={onFavorite}
          className={`absolute right-2.5 top-2.5 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full transition duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--spm-acc)] disabled:cursor-not-allowed disabled:opacity-50 sm:h-9 sm:w-9 ${
            favorite
              ? 'bg-white text-amber-500 shadow-sm'
              : 'bg-white/90 text-slate-600 shadow-sm hover:bg-white hover:text-slate-900'
          }`}
          aria-pressed={favorite}
          aria-label={favorite ? '즐겨찾기에서 제거' : '즐겨찾기에 추가'}
          title={!favoriteEnabled ? '로그인 후 즐겨찾기할 수 있습니다' : favorite ? '즐겨찾기에서 제거' : '즐겨찾기에 추가'}
          disabled={!favoriteEnabled}
        >
          <Bookmark className={`h-4 w-4 ${favorite ? 'fill-current' : ''}`} aria-hidden />
        </button>
      ) : null}
    </article>
  );
}
