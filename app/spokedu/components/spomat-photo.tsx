'use client';

import Image from 'next/image';
import { SPOKEDU_IMAGES } from '../data/images';

type SpomatPhotoProps = {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  priority?: boolean;
  /** 테두리·배경 없이 매트만 (오버레이용) */
  bare?: boolean;
};

const boxClass = {
  sm: 'h-9 w-9 sm:h-10 sm:w-10',
  md: 'h-14 w-14 sm:h-16 sm:w-16',
  lg: 'h-24 w-24 sm:h-28 sm:w-28',
} as const;

/** SPOMOVE 4색 스포매트 — 시그니처 교구 사진 */
export function SpomatPhoto({
  className = '',
  size = 'md',
  priority = false,
  bare = false,
}: SpomatPhotoProps) {
  return (
    <div
      className={`relative overflow-hidden ${boxClass[size]} ${
        bare
          ? 'rounded-lg shadow-[0_8px_20px_-8px_rgba(0,0,0,0.55)]'
          : 'rounded-xl shadow-sm shadow-slate-900/15'
      } ${className}`}
    >
      <Image
        src={SPOKEDU_IMAGES.brand.spomat.src}
        alt={SPOKEDU_IMAGES.brand.spomat.alt}
        fill
        sizes={size === 'lg' ? '112px' : size === 'md' ? '64px' : '40px'}
        className="object-cover"
        priority={priority}
      />
    </div>
  );
}
