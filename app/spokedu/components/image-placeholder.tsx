'use client';

import type { SpokeduImageCategory } from '../data/images';
import { SpokeduImage } from './spokedu-image';

type ImagePlaceholderProps = {
  slot: string;
  alt: string;
  title?: string;
  caption?: string;
  src?: string;
  className?: string;
  category?: SpokeduImageCategory;
  fill?: boolean;
};

/** @deprecated slot/title/caption은 추적용으로만 두고, 화면에는 노출하지 않습니다. SpokeduImage를 사용하세요. */
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
