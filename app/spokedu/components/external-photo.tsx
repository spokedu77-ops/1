'use client';

import { useState } from 'react';

type ExternalPhotoProps = {
  src: string;
  alt: string;
  className?: string;
  fit?: 'cover' | 'contain';
  /** Hero·첫 카드 등 LCP 후보 */
  priority?: boolean;
  sizes?: string;
};

/**
 * postimg 등 외부 hotlink — next/image 최적화 프록시 없이 직접 로드.
 * 실패 시 배경 placeholder만 남김.
 */
export function ExternalPhoto({
  src,
  alt,
  className = '',
  fit = 'cover',
  priority = false,
}: ExternalPhotoProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <div className={`bg-slate-100 ${className}`} role="img" aria-label={alt} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={`h-full w-full ${fit === 'contain' ? 'object-contain' : 'object-cover'} ${className}`}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
