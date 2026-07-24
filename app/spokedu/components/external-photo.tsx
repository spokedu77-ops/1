'use client';

import Image from 'next/image';
import { useState } from 'react';

type ExternalPhotoProps = {
  src: string;
  alt: string;
  className?: string;
  fit?: 'cover' | 'contain';
  /** Hero·첫 카드 등 LCP 후보 */
  priority?: boolean;
  sizes?: string;
  quality?: number;
  /** object-cover 앵커 (예: `50% 40%`) */
  objectPosition?: string;
};

/**
 * 로컬/외부 실사 — next/image fill.
 * 부모가 크기를 잡거나, className에 absolute inset-0 등을 넘긴다.
 * (relative를 강제하면 absolute와 충돌해 높이 0 → 이미지가 안 보임)
 */
export function ExternalPhoto({
  src,
  alt,
  className = '',
  fit = 'cover',
  priority = false,
  sizes = '(max-width: 768px) 100vw, 50vw',
  quality = 88,
  objectPosition,
}: ExternalPhotoProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <div className={`bg-slate-100 ${className}`} role="img" aria-label={alt} />;
  }

  const isRemote = /^https?:\/\//i.test(src);
  const hasPosition = /\b(absolute|relative|fixed|sticky)\b/.test(className);
  const positionClass = hasPosition ? '' : 'relative h-full w-full';

  return (
    <div className={`${positionClass} overflow-hidden bg-slate-100 ${className}`.trim()}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        quality={quality}
        className={fit === 'contain' ? 'object-contain' : 'object-cover'}
        style={objectPosition ? { objectPosition } : undefined}
        referrerPolicy={isRemote ? 'no-referrer' : undefined}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
