'use client';

import Image from 'next/image';
import { useState, type ReactNode } from 'react';

import {
  getImageFallbackSrc,
  isRemoteImage,
  normalizeImageSrc,
} from '../../lib/program-media';

function isSvgSrc(src: string) {
  return /\.svg(\?|#|$)/i.test(src);
}

/**
 * Home Weekly media stage: full column width.
 * Backdrop fills the stage; foreground contain preserves authored composition.
 */
export function InstructionalThumb({
  src,
  alt = '',
  sizes,
  priority = false,
  className,
  presentation = 'default',
  fallback,
}: {
  src: string;
  alt?: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  presentation?: 'default' | 'home-clean-square' | 'full-visible-4-3';
  fallback?: ReactNode;
}) {
  const imageSrc = normalizeImageSrc(src);
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(imageSrc) && !failed;
  const unoptimized = isRemoteImage(imageSrc) && !imageSrc.includes('.supabase.co');
  const svg = isSvgSrc(imageSrc);
  const cleanSquare = presentation === 'home-clean-square';
  const fullVisibleFourThree = presentation === 'full-visible-4-3';

  const failOver = (event: { currentTarget: HTMLImageElement }) => {
    const fallbackSrc = getImageFallbackSrc(imageSrc);
    if (fallbackSrc && event.currentTarget.src !== fallbackSrc) {
      event.currentTarget.src = fallbackSrc;
      return;
    }
    setFailed(true);
  };

  return (
    <div
      data-master-media="instructional"
      className={`relative overflow-hidden rounded-[16px] bg-slate-200 ${cleanSquare ? 'aspect-square w-full' : 'aspect-[4/3] w-full'} ${className ?? ''}`.trim()}
    >
      {showImage ? (
        fullVisibleFourThree ? (
          <Image
            src={imageSrc}
            alt={alt}
            fill
            sizes={sizes}
            quality={75}
            priority={priority}
            unoptimized={unoptimized}
            className="object-contain object-center"
            onError={failOver}
          />
        ) : svg ? (
          <Image
            src={imageSrc}
            alt={alt}
            fill
            sizes={sizes}
            quality={75}
            priority={priority}
            unoptimized={unoptimized}
            className="object-fill object-center"
            onError={failOver}
          />
        ) : cleanSquare ? (
          <Image
            src={imageSrc}
            alt={alt}
            fill
            sizes={sizes}
            quality={75}
            priority={priority}
            unoptimized={unoptimized}
            className="object-cover object-center"
            onError={failOver}
          />
        ) : (
          <>
            <Image
              src={imageSrc}
              alt=""
              fill
              sizes={sizes}
              quality={40}
              priority={priority}
              unoptimized={unoptimized}
              aria-hidden
              className="scale-110 object-cover object-center blur-xl"
              onError={failOver}
            />
            <span className="pointer-events-none absolute inset-0 bg-slate-950/20" aria-hidden />
            <Image
              src={imageSrc}
              alt={alt}
              fill
              sizes={sizes}
              quality={75}
              priority={priority}
              unoptimized={unoptimized}
              className="object-contain object-center"
              onError={failOver}
            />
          </>
        )
      ) : (
        fallback ?? <div className="absolute inset-0 bg-slate-200" />
      )}
    </div>
  );
}
