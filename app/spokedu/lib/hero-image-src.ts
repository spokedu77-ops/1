import { HOME_MEDIA, type HomeMediaKey } from '../data/home-media';

/** 랜딩 Hero LCP preload·OG용 — 이미지만. video 슬롯은 poster. */
export function resolveHeroImageSrc(mediaKey: HomeMediaKey): string | null {
  const media = HOME_MEDIA[mediaKey];
  if (!media) return null;
  if (media.type === 'video') return media.poster;
  return media.src;
}
