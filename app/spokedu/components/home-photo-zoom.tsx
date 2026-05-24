'use client';

import { useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { fineHover } from '../lib/ui-classes';

/** 카드 hover 시 사진만 은은하게 확대 (레이아웃 밀림·모션 축소 설정 존중) */
export function HomePhotoZoom({ children, className = '' }: { children: ReactNode; className?: string }) {
  const reducedMotion = useReducedMotion();
  const zoom =
    reducedMotion
      ? ''
      : `${fineHover}transition-transform ${fineHover}duration-700 ${fineHover}ease-out ${fineHover}group-hover:scale-[1.04]`;

  return <div className={`relative h-full w-full overflow-hidden ${className} ${zoom}`}>{children}</div>;
}
