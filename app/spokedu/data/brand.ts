export const brandProfile = {
  nameEn: 'SPOKEDU',
  nameKo: '스포키듀',
  representative: '최지훈',
  phone: '010-4437-9294',
  email: 'help@spokedu.com',
  address: '서울·경기 운영권역 (상세 미팅 장소는 상담 후 안내)',
  businessInfo: {
    // TODO: 사업자등록번호/상호/통신판매업 정보 확정 후 교체
    displayText: '사업자 정보: TODO (사업자등록번호/상호 확정 후 표기)',
    displayLocation: 'footer',
  },
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
    // TODO: 실제 네이버 블로그 URL 확정 후 교체
    href: 'https://example.com/spokedu-naver-blog',
    description: '월간 수업 후기와 운영 스토리',
    isPending: true,
  },
  {
    key: 'instagram',
    label: '인스타그램',
    // TODO: 실제 인스타그램 URL 확정 후 교체
    href: 'https://example.com/spokedu-instagram',
    description: '현장 사진과 짧은 운영 소식',
    isPending: true,
  },
  {
    key: 'youtube',
    label: '유튜브 · 쇼츠',
    // TODO: 실제 유튜브 URL 확정 후 교체
    href: 'https://example.com/spokedu-youtube',
    description: '수업 영상 아카이브 확장 채널',
    isPending: true,
  },
  {
    key: 'kakao-channel',
    label: '카카오채널',
    // TODO: 실제 카카오채널 URL 확정 후 교체
    href: 'https://example.com/spokedu-kakao-channel',
    description: '상담/공지 채널',
    isPending: true,
  },
];
