'use client';

import { Bookmark, Heart, Play } from 'lucide-react';

import { InstructionalThumb } from '../media/InstructionalThumb';
import { MV_CONTENT_TITLE, MV_HOME_CARD_META, MV_HOME_CARD_TITLE, MV_META } from '../../lib/masterUiClasses';
import { CategoryIcon } from '../ui/ProgramThumb';
import { LessonNewMark } from './LessonCatalogCard';
import { ContentCardMetaLine } from '../content/ContentCardMetaLine';

export function WeeklyEditorialCard({
  title,
  heroImageUrl,
  category,
  supportMeta,
  hasVideo,
  onPreview,
  favorite = false,
  favoriteEnabled = false,
  favoriteHint = '로그인 후 즐겨찾기할 수 있습니다',
  onFavorite,
  accessBadge = null,
  priority = false,
  sizes = '(min-width: 1280px) 250px, (min-width: 768px) 45vw, 82vw',
  cleanSquareMedia = false,
  isNew = false,
  presentation = 'default',
}: {
  title: string;
  heroImageUrl?: string | null;
  category: string;
  supportMeta?: string;
  hasVideo: boolean;
  onPreview: () => void;
  favorite?: boolean;
  favoriteEnabled?: boolean;
  favoriteHint?: string;
  onFavorite?: () => void;
  accessBadge?: '무료 체험' | 'Lite' | null;
  priority?: boolean;
  sizes?: string;
  cleanSquareMedia?: boolean;
  isNew?: boolean;
  presentation?: 'default' | 'home' | 'library-featured';
}) {
  const type = category.trim();
  const support = (supportMeta ?? '').trim();
  const isHomeFamily = presentation === 'home' || presentation === 'library-featured';
  const favoriteChrome = isHomeFamily
    ? favorite
      ? 'text-amber-500 hover:text-amber-600'
      : 'text-slate-500 hover:text-slate-900'
    : favorite
      ? 'bg-white text-amber-500 shadow-sm'
      : 'bg-white/90 text-slate-600 shadow-sm hover:bg-white hover:text-slate-900';

  return (
    <article data-weekly-editorial="" data-presentation={presentation} className="group relative min-w-0 w-full">
      <button
        type="button"
        onClick={onPreview}
        className={`flex w-full cursor-pointer flex-col items-stretch text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--spm-acc)] ${
          isHomeFamily
            ? 'overflow-hidden rounded-[16px] border border-slate-200/80 bg-white transition-colors duration-200 hover:border-slate-300'
            : 'overflow-hidden rounded-[16px] border border-slate-100/80 bg-white transition-colors duration-200 hover:border-slate-200'
        }`}
        aria-label={`${title} 미리보기`}
      >
        <span className="relative block w-full">
          {heroImageUrl ? (
            <InstructionalThumb
              src={heroImageUrl}
              sizes={sizes}
              priority={priority}
              presentation={isHomeFamily ? 'home-cover-4-3' : cleanSquareMedia ? 'home-clean-square' : 'default'}
              className={`${isHomeFamily ? 'rounded-none' : 'rounded-b-none'} transition-opacity duration-200 group-hover:opacity-95`}
            />
          ) : (
            <span className={`relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-slate-200 transition-opacity duration-200 group-hover:opacity-95 ${isHomeFamily ? '' : 'rounded-t-[15px]'}`}>
              <CategoryIcon category={category} size={36} color="rgba(15,23,42,0.45)" />
            </span>
          )}
          {isNew || hasVideo || accessBadge ? (
            <span className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5">
              {accessBadge ? (
                <span className={`rounded-[6px] px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ${accessBadge === '무료 체험' ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-amber-950'}`}>
                  {accessBadge}
                </span>
              ) : null}
              {isNew ? <LessonNewMark /> : null}
              {hasVideo ? (
                <span className="grid h-7 w-7 place-items-center rounded-[9px] bg-white/75 text-slate-700">
                  <Play className="h-3 w-3 fill-current" aria-hidden />
                </span>
              ) : null}
            </span>
          ) : null}
        </span>
        <div className={isHomeFamily ? 'px-3.5 pb-3.5 pt-3' : 'px-3 pb-3.5 pt-2.5'}>
          <ContentCardMetaLine
            primary={type}
            secondary={support}
            className={isHomeFamily ? MV_HOME_CARD_META : MV_META}
          />
          <span className={`${isHomeFamily ? MV_HOME_CARD_TITLE : MV_CONTENT_TITLE} mt-1 block line-clamp-2 transition-colors duration-200 group-hover:text-slate-700`}>{title}</span>
        </div>
      </button>

      {onFavorite ? (
        <button
          type="button"
          onClick={onFavorite}
          className={`absolute right-2 top-2 z-10 inline-flex h-11 w-11 items-center justify-center rounded-[10px] transition duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--spm-acc)] disabled:cursor-not-allowed disabled:opacity-50 ${favoriteChrome}`}
          aria-pressed={favorite}
          aria-label={favorite ? '즐겨찾기에서 제거' : '즐겨찾기에 추가'}
          title={!favoriteEnabled ? favoriteHint : favorite ? '즐겨찾기에서 제거' : '즐겨찾기에 추가'}
          disabled={!favoriteEnabled}
        >
          <span className={isHomeFamily ? 'grid h-[30px] w-[30px] place-items-center rounded-[9px] bg-white/80' : undefined}>
            {isHomeFamily ? <Heart className={`h-4 w-4 ${favorite ? 'fill-current' : ''}`} aria-hidden /> : <Bookmark className={`h-4 w-4 ${favorite ? 'fill-current' : ''}`} aria-hidden />}
          </span>
        </button>
      ) : null}
    </article>
  );
}
