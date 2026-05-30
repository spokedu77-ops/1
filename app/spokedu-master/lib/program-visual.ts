const DEDICATED_HERO_PREFIX = '/images/spokedu-master/programs/';

export function isDedicatedMasterHero(url?: string | null): boolean {
  return Boolean(url?.includes(DEDICATED_HERO_PREFIX));
}

export function isYoutubeThumbnail(url?: string | null): boolean {
  return Boolean(url?.includes('img.youtube.com'));
}

/** 전용 16:9 경로를 YouTube 썸네일·공용 스톡보다 우선한다. */
export function pickBestHeroUrl(...candidates: Array<string | undefined | null>): string | undefined {
  const urls = candidates.filter((url): url is string => Boolean(url?.trim()));
  const dedicated = urls.find(isDedicatedMasterHero);
  if (dedicated) return dedicated;
  const nonYoutube = urls.find((url) => !isYoutubeThumbnail(url));
  return nonYoutube ?? urls[0];
}
