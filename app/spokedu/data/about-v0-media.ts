import { HOME_SECTION03_PEOPLE } from '../components/home-web/home-section03-people';
import { brandProfile } from './brand';
import { HOME_MEDIA } from './home-media';

/** 본사·LAB 주소 (카카오/메신저 공유·오시는 길 SSOT) */
export const ABOUT_V0_HQ_ADDRESS = `${brandProfile.businessAddress} 스포키듀LAB`;

export const ABOUT_V0_HERO = {
  src: HOME_MEDIA.homeHeroField.src!,
  alt: HOME_MEDIA.homeHeroField.alt,
  objectPosition: HOME_MEDIA.homeHeroField.objectPosition ?? '50% 42%',
} as const;

export const ABOUT_V0_LAB_VISUAL = {
  src: HOME_MEDIA.homeHeroField.src!,
  alt: '스포키듀LAB 센터에서 활동하는 모습',
  objectPosition: '50% 42%',
} as const;

/** 리더십 카드 — 홈 Section 03과 동일 프로필 사진 */
export const ABOUT_V0_LEADERS = [
  {
    num: '01',
    nameEn: 'JIHOON CHOI',
    bio: '연세대학교 체육교육학과 졸업 · 브랜드 총괄 및 SPOMOVE/SPOKEDU LAB 아키텍처 설계',
    ...HOME_SECTION03_PEOPLE[0]!,
    role: 'SPOKEDU 대표',
  },
  {
    num: '02',
    nameEn: '',
    bio: '연세대학교 체육교육학과 졸업 · 중등 2급 정교사(체육) · 기관 교육 과정 및 품질 총괄',
    ...HOME_SECTION03_PEOPLE[1]!,
    role: 'SPOKEDU 총괄',
  },
  {
    num: '03',
    nameEn: '',
    bio: '강원대학교 레저스포츠학과 졸업 · 생활스포츠지도사 2급 · 현장 파견 디렉팅 및 교구 커리큘럼 총괄',
    ...HOME_SECTION03_PEOPLE[2]!,
    role: 'SPOKEDU 수업팀장',
  },
] as const;

/** 카드 프로필 크롭 — 3장 동일 (object-cover object-top) */
export const ABOUT_V0_LEADER_PHOTO_CLASS = 'object-cover object-top' as const;
