import { HOME_SECTION03_PEOPLE } from '../components/home-web/home-section03-people';
import type { HomeMediaKey } from './home-media';
import { SPOKEDU_BASE_PATH, SPOKEDU_PATHS } from './site';

/**
 * About — BRAND · WHAT WE DO · APPROACH · PEOPLE · HISTORY · CLOSING (6 sections).
 * 미검증 수치·가격표 금지. 연혁은 공식 주요연혁·기존 확인 기록 기준.
 */
export const aboutPage = {
  sectionOrder: ['intro', 'whatWeDo', 'approach', 'team', 'history', 'closing'] as const,

  intro: {
    id: 'intro',
    eyebrow: 'ABOUT SPOKEDU',
    titleLines: ['움직임으로', '아이의 성장을 설계합니다.'] as const,
    lead: '스포키듀는 아동·청소년 전문 체육교육 브랜드입니다.',
    body:
      '아이들의 발달 수준과 특성을 고려한 체육수업을 운영하며, 현장의 경험을 교육 콘텐츠와 기술로 확장합니다.',
    mediaKey: 'homeHeroField' as HomeMediaKey,
  },

  whatWeDo: {
    id: 'what-we-do',
    eyebrow: 'WHAT WE DO',
    title: '현장에서 시작해 교육의 가능성을 넓힙니다.',
    branches: [
      {
        id: 'physical-education',
        title: '체육교육',
        body: '학교·기관·개인 맞춤형 체육수업을 운영합니다.',
        links: [
          {
            label: '기관·학교 수업',
            href: `${SPOKEDU_BASE_PATH}/education`,
            trackLabel: 'about-what-education',
          },
          {
            label: '개인·소그룹 수업',
            href: `${SPOKEDU_PATHS.private}`,
            trackLabel: 'about-what-private',
          },
        ],
      },
      {
        id: 'spomove',
        title: 'SPOMOVE',
        body: '시각정보와 신체 움직임을 연결하는 스크린 기반 체육 프로그램입니다.',
        href: `${SPOKEDU_PATHS.spomove}`,
        trackLabel: 'about-what-spomove',
      },
      {
        id: 'subscription',
        title: 'SPOKEDU LAB',
        body: '체육 지도자를 위한 수업 콘텐츠와 운영 플랫폼입니다.',
        href: `${SPOKEDU_PATHS.subscription}`,
        trackLabel: 'about-what-curriculum',
      },
    ] as const,
  },

  approach: {
    id: 'approach',
    eyebrow: 'OUR APPROACH',
    title: '아이마다 다른 출발점. 성장의 방향도 다르게.',
    principles: [
      {
        title: '이해합니다.',
        body: '아이의 특성과 움직임 수준을 살핍니다.',
      },
      {
        title: '설계합니다.',
        body: '발달 수준과 교육 목적에 맞게 활동을 구성합니다.',
      },
      {
        title: '관찰합니다.',
        body: '참여 과정과 움직임의 변화를 살피며 수업을 발전시킵니다.',
      },
    ] as const,
  },

  team: {
    id: 'team',
    eyebrow: 'OUR PEOPLE',
    title: '교육을 설계하고 현장을 움직이는 사람들',
    members: [
      {
        id: 'choi',
        name: HOME_SECTION03_PEOPLE[0]!.name,
        role: '대표',
        photo: HOME_SECTION03_PEOPLE[0]!.photo,
        photoObjectPosition: '50% top',
        credentials: [...HOME_SECTION03_PEOPLE[0]!.credentials],
      },
      {
        id: 'kim-yunki',
        name: HOME_SECTION03_PEOPLE[1]!.name,
        role: '운영총괄',
        photo: HOME_SECTION03_PEOPLE[1]!.photo,
        photoObjectPosition: '50% top',
        credentials: [...HOME_SECTION03_PEOPLE[1]!.credentials],
      },
      {
        id: 'kim-gumin',
        name: HOME_SECTION03_PEOPLE[2]!.name,
        role: '팀장',
        photo: HOME_SECTION03_PEOPLE[2]!.photo,
        photoObjectPosition: '50% top',
        credentials: [...HOME_SECTION03_PEOPLE[2]!.credentials],
      },
    ] as const,
  },

  history: {
    id: 'history',
    eyebrow: 'OUR HISTORY',
    title: '현장에서 쌓아온 경험이 스포키듀의 전문성이 됩니다.',
    yearGroups: [
      {
        year: '2026',
        theme: '전문 체육교육과 기술 기반 콘텐츠 확장',
        items: [
          '서울시·중구 찾아가는 동행 체육교실 7개 기관·100차시 규모 사업',
          '광주광역시 체육 지도자 대상 교육 세미나',
          '서대문구 어린이날 기념 아동청소년축제 부스 운영',
        ],
      },
      {
        year: '2025',
        theme: '공공 체육교육 사업 확대',
        items: [
          '강동구청 찾아가는 스포츠교실 5개교·20회기 운영',
          '강동구보건소 건강캠프 및 건강한 돌봄놀이터 운영',
          '부천 상록학교 특수체육 프로그램 운영',
          '거점형 키움센터 연간 체육 프로그램 계약',
          '이마트 문화센터 미니올림픽 특강(서울·경기·대전)',
          'SPOMOVE 현장 적용 · SPOKEDU LAB 운영',
        ],
      },
      {
        year: '2024',
        theme: '맞춤형 체육교육 영역 확대',
        items: [
          '서대문농아인복지관 아동·가족 체육교육 운영',
          '강동구 가족센터 체육 특강 및 가족 체육대회',
          '양천거점형 우리동네키움센터 체육교육 운영 시작',
        ],
      },
      {
        year: '2023',
        theme: '교육 프로그램 및 지도자 교육 확대',
        items: [
          'KBS 「슈퍼맨이 돌아왔다」 체력측정 자문 출연',
          '동작거점형 우리동네키움센터 체육교육 운영 시작',
          '서초여성가족플라자 파트너 강사 인큐베이팅 교육 참여',
        ],
      },
      {
        year: '2021',
        theme: '지역사회 체육교육 기반 구축',
        items: [
          '종로거점형 우리동네키움센터 체육교육 운영 시작',
          '성북거점형 우리동네키움센터 체육교육 운영 시작',
        ],
      },
      {
        year: '2020',
        theme: 'SPOKEDU 설립',
        items: ['2020년 6월 아동·청소년 체육교육 전문 브랜드 출범'],
      },
    ] as const,
  },

  closing: {
    id: 'closing',
    /** 한 줄 의미 · 화면은 2줄 리듬 */
    tagline: '움직임의 경험이 성장의 기회가 되도록.',
    taglineLines: ['움직임의 경험이', '성장의 기회가 되도록.'] as const,
    brandSign: 'SPOKEDU',
    cta: {
      label: '문의·상담하기',
      href: `${SPOKEDU_BASE_PATH}/contact`,
      trackLabel: 'about-closing-contact',
    },
  },
} as const;

export type AboutHubBranch = (typeof aboutPage.whatWeDo.branches)[number];
type AboutHubBranchWithLinks = Extract<AboutHubBranch, { readonly links: readonly unknown[] }>;

export function isAboutHubBranchWithLinks(
  branch: AboutHubBranch,
): branch is AboutHubBranchWithLinks {
  return 'links' in branch && Array.isArray((branch as { links?: unknown }).links);
}
