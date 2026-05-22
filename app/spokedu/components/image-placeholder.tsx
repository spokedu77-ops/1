'use client';

import type { SpokeduImageCategory } from '../data/images';
import { SpokeduImage } from './spokedu-image';

type ImagePlaceholderProps = {
  alt: string;
  src?: string;
  className?: string;
  category?: SpokeduImageCategory;
  fill?: boolean;
};

/** @deprecated 화면 플레이스홀더 호환 컴포넌트입니다. SpokeduImage를 사용하세요. */
export function ImagePlaceholder({ alt, src, className, category = 'programs', fill }: ImagePlaceholderProps) {
  return (
    <SpokeduImage
      src={src}
      alt={alt}
      category={category}
      fill={fill}
      className={`rounded-xl border border-slate-200 ${className ?? ''}`}
    />
  );
}
