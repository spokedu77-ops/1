import { brandChannels, brandContactLinks, brandProfile, isChannelLive, type BrandChannel } from './brand';
import { getLiveExternalChannels } from './external-channels';

export const SPOKEDU_BASE_PATH = '/spokedu';

/** 홈 Program System 섹션 앵커 (구 /programs 목록 대체) */
export const HOME_PROGRAM_SYSTEM_ID = 'program-system';
export const HOME_PROGRAM_SYSTEM_HREF = `${SPOKEDU_BASE_PATH}#${HOME_PROGRAM_SYSTEM_ID}`;

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
  { label: '수업 사례', path: '/records', href: `${SPOKEDU_BASE_PATH}/records` },
  { label: '문의', path: '/contact', href: `${SPOKEDU_BASE_PATH}/contact` },
];

/** Footer 보조 내비 */
export const footerLinks = siteNavItems;

export function getSocialLinks(): BrandChannel[] {
  return getLiveExternalChannels().filter((channel) => channel.href.trim().length > 0);
}

export type ContactInquiryType = 'private' | 'dispatch' | 'curriculum';

export const contactPage = {
  hero: {
    title: '문의 유형 선택',
    subtitle: '개인·기관·콘텐츠 목적별로 안내합니다.',
  },
  inquiryTypes: [
    {
      id: 'private' as const,
      title: '개인수업 문의',
      description: '연령·경험·고민을 바탕으로 1:1·소그룹 방향을 안내합니다.',
      selectTrackLabel: 'contact-select-private',
      submitTrackLabel: 'contact-submit-private',
      successMessage:
        '문의가 접수되었습니다.\n아이의 연령과 운동 경험을 확인한 뒤 수업 방향을 안내드리겠습니다.',
    },
    {
      id: 'dispatch' as const,
      title: '기관수업 문의',
      description:
        '공간·인원·목적에 맞춰 정규·원덀이·캠프를 제안합니다.',
      selectTrackLabel: 'contact-select-dispatch',
      submitTrackLabel: 'contact-submit-dispatch',
      successMessage:
        '기관 수업 문의가 접수되었습니다.\n공간, 인원, 운영 목적을 확인한 뒤 제안 방향을 안내드리겠습니다.',
    },
    {
      id: 'curriculum' as const,
      title: '콘텐츠 문의',
      description: '수업안·매뉴얼·교구·강사 교육·제휴를 안내합니다.',
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
