export const brandProfile = {
  nameEn: 'SPOKEDU',
  nameKo: '스포키듀',
  tagline: '아동·청소년 체육교육 전문 운영 단체',
  representative: '최지훈',
  phone: '010-4437-9294',
  email: 'spokedu77@gmail.com',
  serviceArea: '서울·경기 중심 상담 가능',
} as const;

export const brandContactLinks = {
  phone: `tel:${brandProfile.phone}`,
  email: `mailto:${brandProfile.email}`,
} as const;

export type BrandChannelKey = 'naver-blog' | 'instagram' | 'youtube' | 'kakao-channel';

export type BrandChannel = {
  key: BrandChannelKey;
  label: string;
  href: string;
  description: string;
  isPending: boolean;
};

export const brandChannels: BrandChannel[] = [
  {
    key: 'naver-blog',
    label: '네이버 블로그',
    href: '',
    description: '월간 수업 후기와 운영 스토리',
    isPending: true,
  },
  {
    key: 'instagram',
    label: '인스타그램',
    href: '',
    description: '현장 사진과 짧은 운영 소식',
    isPending: true,
  },
  {
    key: 'youtube',
    label: '유튜브 · 쇼츠',
    href: '',
    description: '수업 영상 아카이브 확장 채널',
    isPending: true,
  },
  {
    key: 'kakao-channel',
    label: '카카오채널',
    href: '',
    description: '상담/공지 채널',
    isPending: true,
  },
];

export function isExternalChannelHrefReady(href: string | undefined | null): boolean {
  const trimmed = (href ?? '').trim();
  if (!trimmed) return false;
  if (/example\.com/i.test(trimmed)) return false;
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
}

export function isChannelLive(channel: BrandChannel): boolean {
  return !channel.isPending && isExternalChannelHrefReady(channel.href);
}
