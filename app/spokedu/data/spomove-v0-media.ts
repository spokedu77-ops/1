import { dispatchInquiryHref, spomoveInquiryHref } from './commercial-routes';
import { HOME_MEDIA } from './home-media';
import { SPOKEDU_IMAGES } from './images';
import { SPOKEDU_PATHS } from './site';

/** Hero — SPOMOVE 화면·SPOMAT·현장이 한 장면에 연결된 실사 */
export const SPOMOVE_V0_HERO = {
  src: HOME_MEDIA.spomoveClassConnected.src!,
  alt: HOME_MEDIA.spomoveClassConnected.alt,
  objectPosition: HOME_MEDIA.spomoveClassConnected.objectPosition ?? '48% 42%',
} as const;

/** Hero 보조 — 실제 SPOMOVE 구동 UI 캡처 */
export const SPOMOVE_V0_SCREEN = {
  src: HOME_MEDIA.spomoveScreenColor.src!,
  alt: HOME_MEDIA.spomoveScreenColor.alt,
  objectPosition: HOME_MEDIA.spomoveScreenColor.objectPosition ?? '50% 50%',
} as const;

/** SPOMAT 4색 제품 이미지 */
export const SPOMOVE_V0_SPOMAT = {
  src: SPOKEDU_IMAGES.brand.spomat.src,
  alt: SPOKEDU_IMAGES.brand.spomat.alt,
  objectPosition: '50% 50%',
} as const;

export const SPOMOVE_V0_LINKS = {
  catalog: SPOKEDU_PATHS.spomoveCatalog,
  spomat: SPOKEDU_PATHS.spomat,
  lab: SPOKEDU_PATHS.subscription,
  institutionDispatch: dispatchInquiryHref({ program: 'spomove' }),
  institutionEducationContact: `${SPOKEDU_PATHS.education}#contact`,
  spomatPurchaseInquiry: spomoveInquiryHref({ operation: 'equipment' }),
  spomoveAdoptionInquiry: spomoveInquiryHref({ operation: 'adoption' }),
} as const;
