import { pickBestHeroUrl, isDedicatedMasterHero } from './program-visual';
import { resolveTrustedReferenceVideoUrl } from './verified-program-video';
import type { Program } from '../types';

function trustedVideoUrl(program: Program): string | undefined {
  return resolveTrustedReferenceVideoUrl(program.lessonDetail?.videoUrl, program);
}

const STOCK_IMAGE_PATTERNS = [
  /\/images\/spokedu\/records\//,
  /\/images\/spokedu\/cases\/hero/,
  /\/images\/spokedu\/curriculum-instructor/,
  /\/images\/spokedu\/programs\//,
  /\/images\/spokedu\/home\//,
];

export function isStockPlaceholderImage(url?: string | null): boolean {
  if (!url?.trim()) return false;
  if (isDedicatedMasterHero(url)) return false;
  return STOCK_IMAGE_PATTERNS.some((pattern) => pattern.test(url));
}

/** seed SVG·임시 hero — 실촬영 전에는 YouTube 썸네일이 더 낫다 */
export function isInterimDedicatedHero(url?: string | null): boolean {
  if (!url) return false;
  return url.includes('/_placeholder/') || /\/hero\.svg$/i.test(url);
}

export function getYouTubeId(url?: string) {
  if (!url) return undefined;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return match?.[1];
}

export function getVideoThumbnail(url?: string) {
  const youtubeId = getYouTubeId(url);
  return youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : undefined;
}

export function getVideoEmbedUrl(url?: string, options?: { autoplay?: boolean }) {
  const youtubeId = getYouTubeId(url);
  if (!youtubeId) return undefined;
  const autoplay = options?.autoplay ? '1' : '0';
  const mute = options?.autoplay ? '1' : '0';
  return `https://www.youtube.com/embed/${youtubeId}?autoplay=${autoplay}&mute=${mute}&playsinline=1&rel=0&modestbranding=1&enablejsapi=1`;
}

export function isDirectVideoUrl(url?: string) {
  return Boolean(url && /\.(mp4|webm|ogg)(\?.*)?$/i.test(url));
}

export function getExternalVideoUrl(url?: string) {
  const text = (url ?? '').trim();
  if (!/^https?:\/\//i.test(text)) return undefined;
  if (getVideoEmbedUrl(text) || isDirectVideoUrl(text)) return undefined;
  return text;
}

export function normalizeImageSrc(src: string) {
  if (!src.includes('img.youtube.com')) return src;
  // Keep hqdefault for list/card surfaces — maxres is heavy on low-end / weak networks.
  return src
    .replace('/maxresdefault.jpg', '/hqdefault.jpg')
    .replace('/sddefault.jpg', '/hqdefault.jpg')
    .replace('/mqdefault.jpg', '/hqdefault.jpg')
    .replace('/default.jpg', '/hqdefault.jpg');
}

export function getImageFallbackSrc(src: string) {
  if (!src.includes('img.youtube.com') || !src.includes('/hqdefault.jpg')) return undefined;
  return src.replace('/hqdefault.jpg', '/mqdefault.jpg');
}

export function isRemoteImage(src: string) {
  return /^https?:\/\//.test(src);
}

/** 홈·라이브러리 카드/히어로 — 전용 hero 우선, 검증된 참고 영상 썸네일만 그다음 */
export function resolveProgramHero(program: Program): string | undefined {
  const videoUrl = trustedVideoUrl(program);
  const videoThumb = videoUrl ? getVideoThumbnail(videoUrl) : undefined;
  const setupImage = program.lessonDetail?.setupImageUrl?.trim();
  const legacyFallback = pickBestHeroUrl(program.thumbnailUrl, program.lessonDetail?.heroImageUrl);

  if (setupImage) return setupImage;
  if (videoThumb) return videoThumb;
  return legacyFallback;
}

export function programHasPlayableVideo(program: Program): boolean {
  if (program.hasReferenceVideo && !program.lessonDetail?.videoUrl) {
    return true;
  }
  const videoUrl = trustedVideoUrl(program);
  return Boolean(
    getVideoEmbedUrl(videoUrl) || isDirectVideoUrl(videoUrl) || getExternalVideoUrl(videoUrl),
  );
}

export function getTrustedProgramVideoUrl(program: Program): string | undefined {
  return trustedVideoUrl(program);
}
