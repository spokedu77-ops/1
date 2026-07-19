'use client';

import { BookOpen, Bookmark, Check, Lock, Play } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { CategoryIcon } from '../ui/ProgramThumb';
import {
  getImageFallbackSrc,
  isRemoteImage,
  normalizeImageSrc,
} from '../../lib/program-media';

/**
 * SPOMOVE 홈 카드와 같은 골격
 * - 정사각 썸네일 + 코너 배지
 * - 액센트 라벨 → 제목 → 한 줄 설명 → 솔리드 CTA
 * - 프리미엄 카드 = isPro 잠금 수업 (SPOMOVE와 별개)
 */

/** 정사각 프레임과 원본 비율 차이가 크면 fill(비율 조정), 아니면 cover */
function shouldStretchToSquare(width: number, height: number, src: string) {
  if (/\.svg(\?|#|$)/i.test(src)) return true;
  if (!width || !height) return false;
  const ratio = width / height;
  return ratio > 1.08 || ratio < 0.93;
}

/** `한글 제목 (English Subtitle)` → 표시 제목 / 부제 분리 */
export function splitLessonCardTitle(raw: string): { title: string; subtitle: string } {
  const text = raw.trim();
  const matched = text.match(/^(.+?)\s*[（(]([^）)]*[A-Za-z][^）)]*)[）)]\s*$/u);
  if (!matched) return { title: text, subtitle: '' };
  return { title: matched[1]!.trim(), subtitle: matched[2]!.trim() };
}

function placeholderBackground(category: string) {
  const key = category.trim();
  if (key.includes('술래')) return '#dce7ef';
  if (key.includes('도전')) return '#e8e0f0';
  if (key.includes('경쟁')) return '#f0e4dc';
  if (key.includes('협동')) return '#dceee6';
  if (key.includes('조절')) return '#e4e6f4';
  return '#e2e8f0';
}

function CoverImage({
  src,
  alt,
  sizes,
  priority = false,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
}) {
  const imageSrc = normalizeImageSrc(src);
  const [stretch, setStretch] = useState(() => /\.svg(\?|#|$)/i.test(imageSrc));
  const fitClass = stretch
    ? 'object-fill object-center'
    : 'object-cover object-center transition-transform duration-150 group-hover:scale-[1.015]';

  const applyNaturalSize = (width: number, height: number) => {
    if (shouldStretchToSquare(width, height, imageSrc)) setStretch(true);
  };

  if (isRemoteImage(imageSrc)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- remote program heroes may sit outside next/image patterns
      <img
        src={imageSrc}
        alt={alt}
        className={`absolute inset-0 h-full w-full ${fitClass}`}
        loading={priority ? 'eager' : 'lazy'}
        onLoad={(event) => {
          applyNaturalSize(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight);
        }}
        onError={(event) => {
          const fallback = getImageFallbackSrc(imageSrc);
          if (fallback && event.currentTarget.src !== fallback) event.currentTarget.src = fallback;
        }}
      />
    );
  }

  return (
    <Image
      src={imageSrc}
      alt={alt}
      fill
      sizes={sizes}
      className={fitClass}
      priority={priority}
      onLoadingComplete={(img) => {
        applyNaturalSize(img.naturalWidth, img.naturalHeight);
      }}
    />
  );
}

export type LessonCatalogCardVariant = 'home' | 'library';

export type LessonCatalogCardProps = {
  title: string;
  heroImageUrl?: string | null;
  categoryFallback?: string;
  hasVideo: boolean;
  onPreview: () => void;
  detailHref: string;
  /** 1줄: 테마 · 대상 등 결정 메타 → 액센트 라벨 */
  decisionMeta?: string;
  /** 2줄: 준비물·활동 등 지원 보조 → 설명 */
  supportMeta?: string;
  /** @deprecated decisionMeta / supportMeta 사용 */
  contextMeta?: string;
  /** @deprecated */
  activityPrepMeta?: string;
  cornerLabel?: string;
  locked?: boolean;
  used?: boolean;
  favorite?: boolean;
  favoriteEnabled?: boolean;
  onFavorite?: () => void;
  priority?: boolean;
  variant?: LessonCatalogCardVariant;
  dataAttrs?: Record<string, string | undefined>;
  sizes?: string;
};

export function LessonCatalogCard({
  title: rawTitle,
  heroImageUrl,
  categoryFallback = '체육 수업',
  hasVideo,
  onPreview,
  detailHref,
  decisionMeta,
  supportMeta,
  contextMeta,
  activityPrepMeta,
  cornerLabel,
  locked = false,
  used = false,
  favorite = false,
  favoriteEnabled = false,
  onFavorite,
  priority = false,
  variant = 'library',
  dataAttrs,
  sizes = '(min-width: 1280px) 300px, (min-width: 768px) 45vw, 82vw',
}: LessonCatalogCardProps) {
  const articleProps = Object.fromEntries(
    Object.entries(dataAttrs ?? {}).filter((entry): entry is [string, string] => Boolean(entry[1])),
  );
  const { title, subtitle } = splitLessonCardTitle(rawTitle);
  const eyebrow = (decisionMeta ?? contextMeta ?? categoryFallback).trim() || categoryFallback;
  const description = (supportMeta ?? activityPrepMeta ?? subtitle).trim();
  const showUsed = variant === 'library' && used;
  const showFavorite = variant === 'library' && Boolean(onFavorite);

  return (
    <article
      {...articleProps}
      className={`group flex h-full min-h-[360px] flex-col overflow-hidden rounded-[18px] bg-[var(--spm-s1)] text-[color:var(--spm-t)] transition duration-200 ${
        locked
          ? 'border border-amber-300/90 shadow-[0_0_0_1px_rgba(251,191,36,0.25)] hover:border-amber-400 hover:shadow-[0_2px_14px_rgba(245,158,11,0.18)]'
          : 'border border-[color:var(--spm-br2)] shadow-[0_16px_34px_rgba(15,23,42,0.12)] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--spm-acc)_35%,transparent)] hover:shadow-[0_20px_42px_rgba(79,70,229,0.18)]'
      }`}
    >
      <div className="relative aspect-square w-full overflow-hidden border-b border-[color:var(--spm-br)] bg-[var(--spm-s1)]">
        <button
          type="button"
          onClick={onPreview}
          className="absolute inset-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--spm-acc)]"
          aria-label={`${title} 수업 미리보기`}
        >
          {heroImageUrl ? (
            <CoverImage src={heroImageUrl} alt="" sizes={sizes} priority={priority} />
          ) : (
            <div
              className="absolute inset-0 grid place-items-center"
              style={{ background: placeholderBackground(categoryFallback) }}
            >
              <CategoryIcon category={categoryFallback} size={34} color="rgba(51,65,85,0.55)" />
            </div>
          )}
          <span className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-150 group-hover:bg-black/[0.07]" />
        </button>

        {(cornerLabel || locked || showUsed) && (
          <div className="pointer-events-none absolute right-3 top-3 flex max-w-[72%] flex-wrap justify-end gap-1">
            {cornerLabel ? (
              <span className="rounded-full border border-white/80 bg-[color-mix(in_srgb,var(--spm-s1)_90%,transparent)] px-2.5 py-1 text-[11px] font-black text-[color:var(--spm-t2)] shadow-sm backdrop-blur">
                {cornerLabel}
              </span>
            ) : null}
            {locked ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
                <Lock className="h-3 w-3" />
                프리미엄
              </span>
            ) : null}
            {showUsed ? (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2.5 py-1 text-[11px] font-semibold text-white"
                title="사용 이력 있음"
              >
                <Check className="h-3 w-3" />
                사용함
              </span>
            ) : null}
          </div>
        )}

        {showFavorite ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onFavorite?.();
            }}
            className={`absolute left-2.5 top-2.5 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full transition duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--spm-acc)] disabled:cursor-not-allowed disabled:opacity-50 ${
              favorite
                ? 'bg-white text-amber-500 shadow-sm'
                : 'bg-white/90 text-slate-600 shadow-sm hover:bg-white hover:text-slate-900'
            }`}
            aria-pressed={favorite}
            aria-label={favorite ? '즐겨찾기에서 제거' : '즐겨찾기에 추가'}
            title={
              !favoriteEnabled
                ? '로그인 후 즐겨찾기할 수 있습니다'
                : favorite
                  ? '즐겨찾기에서 제거'
                  : '즐겨찾기에 추가'
            }
            disabled={!favoriteEnabled}
          >
            <Bookmark className={`h-4 w-4 ${favorite ? 'fill-current' : ''}`} />
          </button>
        ) : null}

        {hasVideo ? (
          <span className="pointer-events-none absolute bottom-2.5 left-2.5 flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-slate-900 shadow-[0_2px_10px_rgba(15,23,42,0.22)] ring-1 ring-black/5 transition-transform duration-150 group-hover:scale-105"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
            </span>
            <span className="rounded-md bg-black/55 px-2 py-1 text-[11px] font-semibold text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              미리보기
            </span>
          </span>
        ) : (
          <span className="pointer-events-none absolute bottom-2.5 left-2.5 rounded-md bg-black/55 px-2 py-1 text-[11px] font-semibold text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            미리보기
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-black text-[var(--spm-acc)]">{eyebrow}</p>
        <h3 className="mt-1 line-clamp-2 min-h-10 text-[17px] font-black leading-5 text-[color:var(--spm-t)]">
          {title}
        </h3>
        <p className="mt-2 line-clamp-2 min-h-10 text-[12px] font-semibold leading-5 text-[color:var(--spm-t2)]">
          {description || '\u00a0'}
        </p>

        {locked ? (
          <Link
            href="/spokedu-master/payment?plan=premium"
            className="mt-auto inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] border border-amber-300 bg-amber-50 text-[13px] font-black text-amber-800 transition-colors hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--spm-acc)]"
          >
            프리미엄 자료
          </Link>
        ) : (
          <Link
            href={detailHref}
            className="mt-auto inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--spm-acc)] text-[13px] font-black text-white transition-colors hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--spm-acc)]"
          >
            <BookOpen size={15} />
            자료 보기
          </Link>
        )}
      </div>
    </article>
  );
}

/** 메타 조각을 ` · ` 로 이어 한 줄로 만든다. */
export function joinCatalogMeta(parts: Array<string | null | undefined | false>): string {
  return parts.map((part) => (typeof part === 'string' ? part.trim() : '')).filter(Boolean).join(' · ');
}
