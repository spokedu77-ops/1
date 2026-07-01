import { brandChannels, brandContactLinks, brandProfile, isChannelLive, type BrandChannel } from './brand';
import { getLiveExternalChannels } from './external-channels';

export const SPOKEDU_BASE_PATH = '/spokedu';

/** @deprecated 홈 프로그램 앵커 — 서브 페이지 호환용 */
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

export type SiteNavLink = {
  label: string;
  href: string;
  trackLabel: string;
};

export type SiteNavEntry =
  | {
      type: 'link';
      label: string;
      href: string;
      trackLabel: string;
      /** pathname이 `/spokedu{matchPrefix}`로 시작하면 활성 */
      matchPrefix?: string;
    }
  | {
      type: 'group';
      label: string;
      trackLabel: string;
      children: SiteNavLink[];
    };

export const siteNav: SiteNavEntry[] = [
  {
    type: 'link',
    label: '스포키듀',
    href: `${SPOKEDU_BASE_PATH}/about`,
    trackLabel: 'nav-about',
    matchPrefix: '/about',
  },
  {
    type: 'group',
    label: '프로그램',
    trackLabel: 'nav-programs',
    children: [
      {
        label: '개인·소그룹 수업',
        href: `${SPOKEDU_BASE_PATH}/private`,
        trackLabel: 'nav-private',
      },
      {
        label: '기관 출강',
        href: `${SPOKEDU_BASE_PATH}/dispatch`,
        trackLabel: 'nav-dispatch',
      },
      {
        label: '특수체육',
        href: `${SPOKEDU_BASE_PATH}/dispatch#special`,
        trackLabel: 'nav-special',
      },
      {
        label: '커리큘럼·지도자 교육',
        href: `${SPOKEDU_BASE_PATH}/curriculum`,
        trackLabel: 'nav-curriculum',
      },
    ],
  },
  {
    type: 'link',
    label: 'SPOMOVE',
    href: `${SPOKEDU_BASE_PATH}/programs/spomove`,
    trackLabel: 'nav-spomove',
    matchPrefix: '/programs/spomove',
  },
  {
    type: 'link',
    label: '수업 사례',
    href: `${SPOKEDU_BASE_PATH}/records`,
    trackLabel: 'nav-records',
    matchPrefix: '/records',
  },
  {
    type: 'link',
    label: '문의',
    href: `${SPOKEDU_BASE_PATH}/contact`,
    trackLabel: 'nav-contact',
    matchPrefix: '/contact',
  },
];

/** @deprecated — `siteNav` 사용 */
export type SiteNavItem = {
  label: string;
  path: string;
  href: string;
};

/** 개인·기관·커리큘럼 3축 — 서브 랜딩·레거시 호환 */
export type AudienceTrackId = 'private' | 'dispatch' | 'curriculum';

export const AUDIENCE_TRACK_ORDER: readonly AudienceTrackId[] = [
  'dispatch',
  'private',
  'curriculum',
] as const;

export const AUDIENCE_TRACK_PATHS: Record<AudienceTrackId, string> = {
  private: '/private',
  dispatch: '/dispatch',
  curriculum: '/curriculum',
};

/** @deprecated — `siteNav` 사용 */
export const siteNavItems: SiteNavItem[] = [
  { label: '스포키듀', path: '/about', href: `${SPOKEDU_BASE_PATH}/about` },
  { label: '기관 출강', path: AUDIENCE_TRACK_PATHS.dispatch, href: `${SPOKEDU_BASE_PATH}/dispatch` },
  { label: '개인수업', path: AUDIENCE_TRACK_PATHS.private, href: `${SPOKEDU_BASE_PATH}/private` },
  { label: '커리큘럼', path: AUDIENCE_TRACK_PATHS.curriculum, href: `${SPOKEDU_BASE_PATH}/curriculum` },
  { label: '수업 사례', path: '/records', href: `${SPOKEDU_BASE_PATH}/records` },
  { label: '문의', path: '/contact', href: `${SPOKEDU_BASE_PATH}/contact` },
];

export const footerNavLinks: SiteNavLink[] = [
  { label: '스포키듀', href: `${SPOKEDU_BASE_PATH}/about`, trackLabel: 'footer-about' },
  { label: '개인·소그룹 수업', href: `${SPOKEDU_BASE_PATH}/private`, trackLabel: 'footer-private' },
  { label: '기관 출강', href: `${SPOKEDU_BASE_PATH}/dispatch`, trackLabel: 'footer-dispatch' },
  { label: 'SPOMOVE', href: `${SPOKEDU_BASE_PATH}/programs/spomove`, trackLabel: 'footer-spomove' },
  { label: '커리큘럼·지도자 교육', href: `${SPOKEDU_BASE_PATH}/curriculum`, trackLabel: 'footer-curriculum' },
  { label: '수업 사례', href: `${SPOKEDU_BASE_PATH}/records`, trackLabel: 'footer-records' },
  { label: '문의', href: `${SPOKEDU_BASE_PATH}/contact`, trackLabel: 'footer-contact' },
];

/** @deprecated */
export const footerLinks = siteNavItems;

export const footerSupplementaryLinks: SiteNavLink[] = [];

export function getSocialLinks(): BrandChannel[] {
  return getLiveExternalChannels().filter((channel) => channel.href.trim().length > 0);
}

export type ContactInquiryType = 'private' | 'dispatch' | 'spomove' | 'curriculum' | 'other';

export const CONTACT_INQUIRY_TYPE_ORDER: readonly ContactInquiryType[] = [
  'private',
  'dispatch',
  'spomove',
  'curriculum',
  'other',
] as const;

export const contactPage = {
  hero: {
    title: '문의 유형 선택',
    subtitle: '개인·기관·SPOMOVE·교육·협업 목적별로 안내합니다.',
  },
  contactTracks: {
    phone: 'contact-phone-click',
    email: 'contact-email-click',
  },
} as const;
