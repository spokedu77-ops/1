import { HOME_MEDIA, type HomeMediaKey } from '../data/home-media';

/** 랜딩 Hero LCP preload·OG용 — 이미지 src. */
export function resolveHeroImageSrc(mediaKey: HomeMediaKey): string | null {
  const media = HOME_MEDIA[mediaKey];
  if (!media) return null;
  return media.src;
}
