'use client';

import Image from 'next/image';
import Link from 'next/link';
import { SPOKEDU_IMAGES } from '../data/images';
import { SPOKEDU_BASE_PATH } from '../data/site';
import { scrollSpokeduToTop } from '../lib/scroll';

type BrandLogoProps = {
  /** 어두운 배경 — 화이트 투명 로고 사용 (박스/필터 없음) */
  onDark?: boolean;
  className?: string;
  scrollHomeOnClick?: boolean;
  asMark?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
};

const sizeClass = {
  sm: 'h-6 w-auto sm:h-7',
  md: 'h-7 w-auto sm:h-8',
  lg: 'h-9 w-auto sm:h-10',
  xl: 'h-10 w-auto sm:h-12 lg:h-14',
} as const;

/** SPOKEDU 워드마크 — 투명 PNG만 사용, 배경 박스 없음 */
export function BrandLogo({
  onDark = false,
  className = '',
  scrollHomeOnClick = false,
  asMark = false,
  size = 'sm',
}: BrandLogoProps) {
  const asset = onDark ? SPOKEDU_IMAGES.brand.logoWhite : SPOKEDU_IMAGES.brand.logo;

  const img = (
    <Image
      src={asset.src}
      alt={asset.alt}
      width={220}
      height={36}
      unoptimized
      className={`${sizeClass[size]} bg-transparent object-contain object-left`}
      style={{ background: 'transparent' }}
      priority={size === 'sm'}
    />
  );

  if (asMark) {
    return <span className={`inline-flex items-center bg-transparent ${className}`}>{img}</span>;
  }

  return (
    <Link
      href={SPOKEDU_BASE_PATH}
      onClick={scrollHomeOnClick ? () => scrollSpokeduToTop() : undefined}
      className={`inline-flex h-8 items-center bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${className}`}
      aria-label="SPOKEDU 홈"
    >
      {img}
    </Link>
  );
}
