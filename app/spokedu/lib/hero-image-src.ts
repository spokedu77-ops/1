import { HOME_MEDIA, type HomeMediaKey } from '../data/home-media';

/** 랜딩 Hero LCP preload·OG용 — `HOME_MEDIA` 슬롯 src */
export function resolveHeroImageSrc(mediaKey: HomeMediaKey): string | null {
  const media = HOME_MEDIA[mediaKey];
  return media?.src ?? null;
}
