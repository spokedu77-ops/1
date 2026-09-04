'use client';

import { Play } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

import {
  getImageFallbackSrc,
  isRemoteImage,
  normalizeImageSrc,
} from '../../lib/program-media';
import { CategoryIcon } from '../ui/ProgramThumb';

function CoverImage({
  src,
  sizes,
  priority,
}: {
  src: string;
  sizes: string;
  priority: boolean;
}) {
  const imageSrc = normalizeImageSrc(src);
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <div className="absolute inset-0 bg-slate-200" />;
  }
  if (isRemoteImage(imageSrc) && !imageSrc.includes('.supabase.co')) {
    return (
      <Image
        src={imageSrc}
        alt=""
        fill
        sizes={sizes}
        priority={priority}
        unoptimized
        className="object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
        onError={(event) => {
          const fallback = getImageFallbackSrc(imageSrc);
          if (fallback && event.currentTarget.src !== fallback) event.currentTarget.src = fallback;
          else setFailed(true);
        }}
      />
    );
  }
  return (
    <Image
      src={imageSrc}
      alt=""
      fill
      sizes={sizes}
      priority={priority}
      className="object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
      onError={(event) => {
        const fallback = getImageFallbackSrc(imageSrc);
        if (fallback && event.currentTarget.src !== fallback) event.currentTarget.src = fallback;
        else setFailed(true);
      }}
    />
  );
}

export function WeeklyEditorialCard({
  title,
  heroImageUrl,
  category,
  supportMeta,
  hasVideo,
  onPreview,
  priority = false,
  sizes = '(min-width: 1280px) 290px, (min-width: 768px) 45vw, 82vw',
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
  const meta = (supportMeta ?? '').trim();

  return (
    <article
      data-weekly-editorial=""
      className="group h-full overflow-hidden rounded-[16px] bg-slate-900 text-white"
    >
      <button
        type="button"
        onClick={onPreview}
        className="relative flex h-full min-h-[240px] w-full flex-col text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        aria-label={`${title} 미리보기`}
      >
        <span className="relative aspect-[16/10] w-full overflow-hidden bg-slate-800">
          {heroImageUrl ? (
            <CoverImage src={heroImageUrl} sizes={sizes} priority={priority} />
          ) : (
            <span
              className="absolute inset-0 grid place-items-center"
              style={{ background: '#334155' }}
            >
              <CategoryIcon category={category} size={36} color="rgba(248,250,252,0.7)" />
            </span>
          )}
          {hasVideo ? (
            <span className="absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/95 text-slate-950 shadow-sm">
              <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
            </span>
          ) : null}
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
          <span className="absolute inset-x-0 bottom-0 px-3.5 pb-3.5 pt-10">
            <span className="block truncate text-[12px] font-medium text-white/80">{category}</span>
            <span className="mt-1 line-clamp-2 text-[17px] font-semibold leading-5">{title}</span>
            {meta ? (
              <span className="mt-1.5 line-clamp-1 text-[12px] font-medium text-white/70">{meta}</span>
            ) : null}
          </span>
        </span>
      </button>
    </article>
  );
}
