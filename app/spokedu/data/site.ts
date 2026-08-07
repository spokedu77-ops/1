import { brandChannels, brandContactLinks, brandProfile, isChannelLive, type BrandChannel } from './brand';
import { getLiveExternalChannels } from './external-channels';
import { SPOKEDU_LEGACY_PREFIX, SPOKEDU_PATHS } from './public-routes';

export {
  SPOKEDU_BASE_PATH,
  SPOKEDU_LEGACY_PREFIX,
  SPOKEDU_PATHS,
  isSpokeduContactPath,
  isSpokeduHomePath,
  isSpomoveCatalogPath,
  spokeduRecordPath,
  spokeduSubscriptionHref,
} from './public-routes';

/** 프로그램 인덱스 — 공식은 SPOMOVE clean URL */
export const HOME_PROGRAM_SYSTEM_ID = 'program-system';
export const HOME_PROGRAM_SYSTEM_HREF = SPOKEDU_PATHS.spomove;

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

/** MASTER handoff — 마케팅 사이트 경로 상수 (가격·권한 SSOT 아님) */
export const MASTER_HANDOFF = {
  landing: '/spokedu-master/landing',
  onboardingLogin: '/login?next=/spokedu-master/onboarding',
  dashboardLogin: '/login?next=/spokedu-master/dashboard',
  payment: '/spokedu-master/payment',
  shop: '/spokedu-master/shop',
} as const;

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
      /** pathname이 matchPrefix로 시작하면 활성 (clean public path) */
      matchPrefix?: string;
    }
  | {
      type: 'group';
      label: string;
      trackLabel: string;
      children: SiteNavLink[];
    };

/** 글로벌 헤더·모바일 메뉴 SSOT */
export const siteNav: SiteNavEntry[] = [
  {
    type: 'link',
    label: '스포키듀',
    href: SPOKEDU_PATHS.about,
    trackLabel: 'nav-about',
    matchPrefix: '/about',
  },
  {
    type: 'link',
    label: '체육교육',
    href: SPOKEDU_PATHS.education,
    trackLabel: 'nav-education',
    matchPrefix: '/education',
  },
  {
    type: 'link',
    label: 'SPOMOVE',
    href: SPOKEDU_PATHS.spomove,
    trackLabel: 'nav-spomove',
    matchPrefix: '/spomove',
  },
  {
    type: 'link',
    label: '구독시스템',
    href: SPOKEDU_PATHS.subscription,
    trackLabel: 'nav-subscription',
    matchPrefix: '/subscription',
  },
  {
    type: 'link',
    label: '운영 사례',
    href: SPOKEDU_PATHS.records,
    trackLabel: 'nav-records',
    matchPrefix: '/records',
  },
  {
    type: 'link',
    label: '문의·협업',
    href: SPOKEDU_PATHS.contact,
    trackLabel: 'nav-contact',
    matchPrefix: '/contact',
  },
];

export const siteHeaderCta = {
  label: '상담하기',
  href: SPOKEDU_PATHS.contact,
  trackLabel: 'header-contact',
} as const;

/** 푸터 탐색 링크 — siteNav와 동일 목적지, trackLabel만 footer 접두 */
export const footerNavLinks: SiteNavLink[] = siteNav
  .filter((entry): entry is Extract<SiteNavEntry, { type: 'link' }> => entry.type === 'link')
  .map((entry) => ({
    label: entry.label,
    href: entry.href,
    trackLabel: entry.trackLabel.replace(/^nav-/, 'footer-'),
  }));

/** 푸터 서비스 바로가기 (허브 하위 실경로) */
export const footerServiceLinks: SiteNavLink[] = [
  {
    label: '기관수업',
    href: SPOKEDU_PATHS.dispatch,
    trackLabel: 'footer-service-dispatch',
  },
  {
    label: '개인·소그룹',
    href: SPOKEDU_PATHS.private,
    trackLabel: 'footer-service-private',
  },
  {
    label: 'SPOMOVE 카탈로그',
    href: `${SPOKEDU_PATHS.spomove}?tab=catalog`,
    trackLabel: 'footer-service-spomove-catalog',
  },
  {
    label: 'SPOMAT',
    href: SPOKEDU_PATHS.spomat,
    trackLabel: 'footer-service-spomat',
  },
  {
    label: '파트너·협업 안내',
    href: SPOKEDU_PATHS.partners,
    trackLabel: 'footer-service-partners',
  },
];

export const footerSupplementaryLinks: SiteNavLink[] = [];

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
  private: SPOKEDU_PATHS.private,
  dispatch: SPOKEDU_PATHS.dispatch,
  curriculum: SPOKEDU_PATHS.subscription,
};

/**
 * @deprecated `siteNav` 사용.
 * content.ts 등 레거시 import 호환용 — 글로벌 IA와 동일한 1급 경로만 평탄화.
 */
export const siteNavItems: SiteNavItem[] = footerNavLinks.map((link) => ({
  label: link.label,
  path: link.href === '/' ? '/' : link.href,
  href: link.href,
}));

/** @deprecated — `footerNavLinks` 사용 */
export const footerLinks = siteNavItems;

export function getSocialLinks(): BrandChannel[] {
  return getLiveExternalChannels().filter((channel) => channel.href.trim().length > 0);
}

/** redirect-only 프로그램 경로 — 메뉴 노출 금지, 레거시 URL·next.config 유지 */
export const REDIRECT_ONLY_PROGRAM_PATHS = [
  `${SPOKEDU_LEGACY_PREFIX}/programs/paps`,
  `${SPOKEDU_LEGACY_PREFIX}/programs/camp`,
  `${SPOKEDU_LEGACY_PREFIX}/programs/oneday-event`,
  `${SPOKEDU_LEGACY_PREFIX}/programs/monthly-newsports`,
] as const;

export type ContactInquiryType = 'private' | 'dispatch' | 'spomove' | 'curriculum' | 'other';

export const CONTACT_INQUIRY_TYPE_ORDER: readonly ContactInquiryType[] = [
  'dispatch',
  'private',
  'curriculum',
  'spomove',
  'other',
] as const;

export const contactPage = {
  hero: {
    title: '상담 유형 선택',
    subtitle: '개인·기관·SPOMOVE·교육·협업 목적별로 안내합니다.',
  },
  contactTracks: {
    phone: 'contact-phone-click',
    email: 'contact-email-click',
  },
} as const;
