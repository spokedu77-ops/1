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
  src: '/images/spokedu/home/field-editorial/home-hero-lab-gym-sponsorship-13.jpg',
  alt: '스포키듀LAB 체육관에서 지도자와 아이들이 수업을 진행하는 센터 현장',
  objectPosition: '52% 58%',
} as const;

export const ABOUT_V0_MILESTONES = [
  { when: '2016. 06', title: '스포키듀(SPOKEDU) 설립 및 방문 체육 출강 시작' },
  { when: '2017. 02', title: 'KBS 「슈퍼맨이 돌아왔다」 아동 체력 측정 자문 출연' },
  { when: '2018. 10', title: '서초여성가족플라자 아동체육 인큐베이팅 강의 진행' },
  { when: '2019. 02', title: '거점형 키움센터 연간 체육 프로그램 정식 계약' },
  { when: '2020. 03', title: '이마트 문화센터 미니올림픽 특강 운영 (서울·경기·대전)' },
  { when: '2021. 05', title: '서대문구 어린이날 기념 아동청소년축제 대규모 체험부스 운영' },
  { when: '2022. 07', title: '광주광역시 체육 지도자 교육 세미나 진행' },
  { when: '2025 ~ 현재', title: '시지각 에듀테크 SPOMOVE 현장 도입 및 지도자 플랫폼 SPOKEDU LAB 운영' },
] as const;

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
