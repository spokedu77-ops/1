'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import type { SpokeduImageCategory, SpokeduImageDef } from '../data/images';
import { getSpokeduImageFallback, SPOKEDU_FALLBACK_FIELD } from '../data/images';

export type SpokeduImageProps = {
  asset?: SpokeduImageDef;
  src?: string;
  alt: string;
  fallback?: string;
  category?: SpokeduImageCategory;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
};

function resolveSources({
  asset,
  src,
  fallback,
  category,
}: Pick<SpokeduImageProps, 'asset' | 'src' | 'fallback' | 'category'>) {
  const primary = asset?.src ?? src ?? asset?.fallback ?? getSpokeduImageFallback(category ?? asset?.category ?? 'home');
  const backup = asset?.fallback ?? fallback ?? getSpokeduImageFallback(category ?? asset?.category ?? 'home');
  return { primary, backup };
}

export function SpokeduImage({
  asset,
  src,
  alt,
  fallback,
  category,
  fill = false,
  width = 1200,
  height = 800,
  sizes,
  priority,
  className = '',
  imageClassName = 'object-cover',
}: SpokeduImageProps) {
  const { primary, backup } = useMemo(
    () => resolveSources({ asset, src, fallback, category }),
    [asset, src, fallback, category],
  );
  const [resolvedSrc, setResolvedSrc] = useState(primary);

  useEffect(() => {
    setResolvedSrc(primary);
  }, [primary]);

  const handleError = () => {
    if (resolvedSrc === primary && primary !== SPOKEDU_FALLBACK_FIELD) {
      setResolvedSrc(SPOKEDU_FALLBACK_FIELD);
      return;
    }
    if (resolvedSrc !== backup) setResolvedSrc(backup);
  };

  const wrapperClass = fill
    ? `absolute inset-0 overflow-hidden bg-slate-100 ${className}`
    : `relative overflow-hidden bg-slate-100 ${className}`;

  return (
    <figure className={wrapperClass}>
      {fill ? (
        <Image
          src={resolvedSrc}
          alt={alt}
          fill
          sizes={sizes ?? '(max-width: 768px) 100vw, 50vw'}
          priority={priority}
          unoptimized={resolvedSrc.startsWith('/images/spokedu/')}
          className={imageClassName}
          onError={handleError}
        />
      ) : (
        <Image
          src={resolvedSrc}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          priority={priority}
          unoptimized={resolvedSrc.startsWith('/images/spokedu/')}
          className={`h-full w-full ${imageClassName}`}
          onError={handleError}
        />
      )}
    </figure>
  );
}
