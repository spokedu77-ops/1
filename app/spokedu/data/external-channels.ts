import { brandChannels, isChannelLive, type BrandChannel, type BrandChannelKey } from './brand';

export type ExternalChannel = BrandChannel;

function channelHrefIfLive(key: BrandChannelKey): string {
  const channel = brandChannels.find((item) => item.key === key);
  return channel && isChannelLive(channel) ? channel.href : '';
}

export const NAVER_BLOG_URL = channelHrefIfLive('naver-blog');
export const INSTAGRAM_URL = channelHrefIfLive('instagram');
export const YOUTUBE_CHANNEL_URL = channelHrefIfLive('youtube');
export const KAKAO_CHANNEL_URL = channelHrefIfLive('kakao-channel');

export const externalChannels: ExternalChannel[] = [...brandChannels];

export function getLiveExternalChannels(): ExternalChannel[] {
  return externalChannels.filter(isChannelLive);
}
