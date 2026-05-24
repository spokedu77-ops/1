import type { ReactNode } from 'react';
import type { HomeMediaKey } from '../data/home-media';
import { resolveHeroImageSrc } from '../lib/hero-image-src';
import { LandingHeroPreload } from './landing-hero-preload';

/** 퍼널 랜딩 page.tsx — Hero preload + 본문 */
export function LandingPageRoot({
  heroMediaKey,
  children,
}: {
  heroMediaKey: HomeMediaKey;
  children: ReactNode;
}) {
  const src = resolveHeroImageSrc(heroMediaKey);
  return (
    <>
      {src ? <LandingHeroPreload src={src} /> : null}
      {children}
    </>
  );
}
