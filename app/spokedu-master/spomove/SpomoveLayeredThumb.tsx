'use client';

import Image from 'next/image';
import { useState, type ReactNode } from 'react';

import { SPOMOVE_IMAGE_THUMB_ASPECT_CLASS } from './spomoveMediaFit';

function isSvgSrc(src: string) {
  return /\.svg(\?|#|$)/i.test(src);
}

export function SpomoveLayeredThumb({
  src,
  alt = '',
  sizes,
  priority = false,
  className,
  presentation = 'default',
  fallback,
  onError,
}: {
  src: string;
  alt?: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  presentation?: 'default' | 'home-clean-square' | 'full-visible-4-3';
  fallback?: ReactNode;
  onError?: () => void;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [stretchSrc, setStretchSrc] = useState<string | null>(() => (isSvgSrc(src) ? src : null));
  const fail = () => {
    setFailedSrc(src);
    onError?.();
  };
  const showImage = Boolean(src) && failedSrc !== src;
  const stretch = isSvgSrc(src) || stretchSrc === src;
  const cleanSquare = presentation === 'home-clean-square';
  const fullVisibleFourThree = presentation === 'full-visible-4-3';

  return (
    <div
      data-spm-spomove-media="image-thumb"
      className={`relative overflow-hidden ${cleanSquare ? 'aspect-square' : fullVisibleFourThree ? 'aspect-[4/3]' : SPOMOVE_IMAGE_THUMB_ASPECT_CLASS} ${className ?? ''}`.trim()}
    >
      {showImage ? (
        cleanSquare ? (
          <Image
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            quality={75}
            priority={priority}
            className="object-cover object-center"
            onError={fail}
          />
        ) : fullVisibleFourThree ? (
          <Image
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            quality={75}
            priority={priority}
            className="object-contain object-center"
            onError={fail}
          />
        ) : stretch ? (
          <Image
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            quality={75}
            priority={priority}
            className="object-fill object-center"
            onLoad={(event) => {
              if (isSvgSrc(src) || event.currentTarget.naturalWidth / Math.max(event.currentTarget.naturalHeight, 1) > 3) {
                setStretchSrc(src);
              }
            }}
            onError={fail}
          />
        ) : (
          <>
            <Image
              src={src}
              alt=""
              fill
              sizes={sizes}
              quality={40}
              priority={priority}
              aria-hidden
              className="scale-110 object-cover object-center blur-xl opacity-55"
            />
            <span className="pointer-events-none absolute inset-0 bg-slate-950/25" aria-hidden />
            <Image
              src={src}
              alt={alt}
              fill
              sizes={sizes}
              quality={75}
              priority={priority}
              className="object-contain object-center"
              onLoad={() => {
                if (isSvgSrc(src)) setStretchSrc(src);
              }}
              onError={fail}
            />
          </>
        )
      ) : (
        fallback ?? <div className="absolute inset-0 bg-slate-200" />
      )}
    </div>
  );
}
