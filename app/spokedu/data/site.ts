import { brandChannels, brandContactLinks, brandProfile, isChannelLive, type BrandChannel } from './brand';
import { getLiveExternalChannels } from './external-channels';

export const SPOKEDU_BASE_PATH = '/spokedu';

export const siteBrand = {
  brandName: brandProfile.nameEn,
  koreanName: brandProfile.nameKo,
  description: brandProfile.tagline,
  representative: brandProfile.representative,
  phone: brandProfile.phone,
  email: brandProfile.email,
  serviceArea: brandProfile.serviceArea,
} as const;

export { brandProfile, brandContactLinks, brandChannels, isChannelLive };
export { getLiveExternalChannels };
export type { BrandChannel };

export type SiteNavItem = {
  label: string;
  path: string;
  href: string;
};

export const siteNavItems: SiteNavItem[] = [
  { label: '브랜드', path: '/about', href: `${SPOKEDU_BASE_PATH}/about` },
  { label: '개인수업', path: '/private', href: `${SPOKEDU_BASE_PATH}/private` },
  { label: '기관수업', path: '/dispatch', href: `${SPOKEDU_BASE_PATH}/dispatch` },
  { label: '커리큘럼', path: '/curriculum', href: `${SPOKEDU_BASE_PATH}/curriculum` },
  { label: '프로그램', path: '/programs', href: `${SPOKEDU_BASE_PATH}/programs` },
  { label: '현장기록', path: '/records', href: `${SPOKEDU_BASE_PATH}/records` },
  { label: '문의', path: '/contact', href: `${SPOKEDU_BASE_PATH}/contact` },
];

/** Footer 보조 내비 */
export const footerLinks = siteNavItems;

export type HomeFinalCtaLink = {
  label: string;
  href: string;
  trackLabel: string;
};

export const homeFinalCta = {
  title: '지금 필요한 방향을 선택하세요',
  subtitle: '아이 개인수업, 기관 파견수업, 커리큘럼·콘텐츠 문의까지 목적에 맞는 상담으로 연결됩니다.',
  primary: {
    label: '개인수업 상담',
    href: `${SPOKEDU_BASE_PATH}/private`,
    trackLabel: 'cta-home-private-final',
  },
  secondary: [
    {
      label: '기관수업 제안',
      href: `${SPOKEDU_BASE_PATH}/dispatch`,
      trackLabel: 'cta-home-dispatch-final',
    },
    {
      label: '커리큘럼 문의',
      href: `${SPOKEDU_BASE_PATH}/curriculum`,
      trackLabel: 'cta-home-curriculum-final',
    },
  ] as const,
} as const;

export function getSocialLinks(): BrandChannel[] {
  return getLiveExternalChannels();
}

export type ContactInquiryType = 'private' | 'dispatch' | 'curriculum';

export const contactPage = {
  hero: {
    title: '개인수업, 기관수업,\n커리큘럼 문의를 나누어 안내합니다',
    subtitle: '개인수업·기관 제안·커리큘럼 문의를 목적별로 안내합니다.',
  },
  inquiryTypes: [
    {
      id: 'private' as const,
      title: '개인·소그룹 수업 문의',
      description:
        '아이의 연령, 운동 경험, 현재 고민을 바탕으로 1:1 또는 소그룹 수업 방향을 안내합니다.',
      selectTrackLabel: 'contact-select-private',
      submitTrackLabel: 'contact-submit-private',
      successMessage:
        '문의가 접수되었습니다.\n아이의 연령과 운동 경험을 확인한 뒤 수업 방향을 안내드리겠습니다.',
    },
    {
      id: 'dispatch' as const,
      title: '기관 파견 수업 문의',
      description:
        '기관의 공간, 인원, 연령, 운영 목적에 맞춰 정규수업·원덀이·캠프 프로그램을 제안합니다.',
      selectTrackLabel: 'contact-select-dispatch',
      submitTrackLabel: 'contact-submit-dispatch',
      successMessage:
        '기관 수업 문의가 접수되었습니다.\n공간, 인원, 운영 목적을 확인한 뒤 제안 방향을 안내드리겠습니다.',
    },
    {
      id: 'curriculum' as const,
      title: '커리큘럼·콘텐츠 문의',
      description:
        '수업안, 운영 매뉴얼, 교구 활용 콘텐츠, 강사 교육과 제휴 방향을 안내합니다.',
      selectTrackLabel: 'contact-select-curriculum',
      submitTrackLabel: 'contact-submit-curriculum',
      successMessage:
        '커리큘럼·콘텐츠 문의가 접수되었습니다.\n필요한 콘텐츠 유형과 활용 목적을 확인한 뒤 안내드리겠습니다.',
    },
  ],
  contactTracks: {
    phone: 'contact-phone-click',
    email: 'contact-email-click',
  },
} as const;
