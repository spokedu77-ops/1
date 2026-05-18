import { brandChannels } from './brand';

export type ExternalChannel = (typeof brandChannels)[number];

export const NAVER_BLOG_URL = brandChannels.find((channel) => channel.key === 'naver-blog')?.href ?? '';
export const INSTAGRAM_URL = brandChannels.find((channel) => channel.key === 'instagram')?.href ?? '';
export const YOUTUBE_CHANNEL_URL = brandChannels.find((channel) => channel.key === 'youtube')?.href ?? '';
export const KAKAO_CHANNEL_URL = brandChannels.find((channel) => channel.key === 'kakao-channel')?.href ?? '';

export const externalChannels: ExternalChannel[] = [...brandChannels];
