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
  fallback,
  onError,
}: {
  src: string;
  alt?: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  fallback?: ReactNode;
  onError?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const [stretch, setStretch] = useState(() => isSvgSrc(src));
  const fail = () => {
    setFailed(true);
    onError?.();
  };
  const showImage = Boolean(src) && !failed;

  return (
    <div
      data-spm-spomove-media="image-thumb"
      className={`relative overflow-hidden ${SPOMOVE_IMAGE_THUMB_ASPECT_CLASS} ${className ?? ''}`.trim()}
    >
      {showImage ? (
        stretch ? (
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
                setStretch(true);
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
                if (isSvgSrc(src)) setStretch(true);
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
