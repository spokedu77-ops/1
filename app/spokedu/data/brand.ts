export const brandProfile = {
  nameEn: 'SPOKEDU',
  nameKo: '스포키듀',
  tagline: '아동·청소년 체육교육 운영 브랜드',
  representative: '최지훈',
  phone: '010-4437-9294',
  email: 'spokedu77@gmail.com',
  businessRegistrationNumber: '311-63-00356',
  /** 통신판매업 신고번호 — 공식 증빙 확인 전 null (Footer 미노출) */
  mailOrderReportNumber: null as string | null,
  /** 사업자등록증상 사업장 (PG·세금계산서 기준) */
  businessAddress: '서울특별시 강동구 성내동 430-2, 7층 2호',
  /** 강동 체육관 방문·수업 장소 (체육관 config와 동일 역할) */
  gymVisitAddress: '서울시 강동구 성내동 430-2, 7층 2호',
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
    href: 'https://blog.naver.com/spokedu77',
    description: '공식 블로그(spokedu77) — 월간 수업 후기와 운영 스토리',
    isPending: false,
  },
  {
    key: 'instagram',
    label: '인스타그램',
    href: 'https://www.instagram.com/spokedu_kids/',
    description: '현장 사진과 짧은 운영 소식',
    isPending: false,
  },
  {
    key: 'youtube',
    label: '유튜브 · 쇼츠',
    href: 'https://www.youtube.com/channel/UCCckdu5nqsVAoWY2_n8-LCw',
    description: '수업 영상 아카이브 확장 채널',
    isPending: false,
  },
  {
    key: 'kakao-channel',
    label: '카카오채널',
    href: 'https://pf.kakao.com/_VGWxeb/chat',
    description: '상담/공지 채널',
    isPending: false,
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

/** Organization JSON-LD sameAs — 공식 채널 단일 원천 */
export function getOrganizationSameAsUrls(): readonly string[] {
  return brandChannels.filter(isChannelLive).map((channel) => channel.href);
}

/** Footer 법적 표기 — 신고번호는 증빙 확정 시에만 포함 */
export function getPublicFooterLegalLine(): string {
  const parts = [
    brandProfile.nameKo,
    `대표 ${brandProfile.representative}`,
    `사업자등록번호 ${brandProfile.businessRegistrationNumber}`,
  ];
  const reportNo = brandProfile.mailOrderReportNumber?.trim();
  if (reportNo) {
    parts.push(`통신판매업 신고번호 ${reportNo}`);
  }
  parts.push(`${brandProfile.businessAddress} 스포키듀LAB`);
  return parts.join(' · ');
}
