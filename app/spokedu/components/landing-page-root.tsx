import type { ReactNode } from 'react';
import type { HomeMediaKey } from '../data/home-media';
import { resolveHeroImageSrc } from '../lib/hero-image-src';
import { LandingHeroPreload } from './landing-hero-preload';

/** 퍼널 랜딩 page.tsx — Hero preload + 본문 */
export function LandingPageRoot({
  heroMediaKey,
  preloadSrc,
  children,
}: {
  heroMediaKey?: HomeMediaKey;
  /** Hero preload URL — `heroMediaKey`보다 우선 (홈 v0 등 고정 자산) */
  preloadSrc?: string;
  children: ReactNode;
}) {
  const src = preloadSrc ?? (heroMediaKey ? resolveHeroImageSrc(heroMediaKey) : null);
  return (
    <>
      {src ? <LandingHeroPreload src={src} /> : null}
      {children}
    </>
  );
}
