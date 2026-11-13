import { HOME_SECTION03_PEOPLE } from '../components/home-web/home-section03-people';
import { SPOKEDU_IMAGES } from './images';
import { aboutFounder } from './about-founder';
import { PUBLIC_PROGRAM_COPY, PUBLIC_TEAM_ROLES } from './public-brand-copy';
import type { HomeMediaKey } from './home-media';
import { SPOKEDU_BASE_PATH, SPOKEDU_PATHS } from './site';

/**
 * About — BRAND · WHAT WE DO · APPROACH · PEOPLE · HISTORY · CLOSING (6 sections).
 * 미검증 수치·가격표 금지. 연혁은 공식 주요연혁·기존 확인 기록 기준.
 */
export const aboutPage = {
  sectionOrder: ['intro', 'whatWeDo', 'approach', 'team', 'history', 'closing'] as const,

  // Public ABOUT presentation; legacy content below remains available to its consumers.
  showcase: [
    {
      number: '01', label: '01. 우리의 시작',
      title: ['2020년, 아이들의 움직임을 위한', '체육교육을 시작했습니다.'],
      body: 'SPOKEDU는 2020년 아동·청소년 체육교육 브랜드로 출발했습니다. 이후 학교와 키움센터 등 다양한 교육 현장에서 직접 수업을 운영하며 아이들의 발달 수준과 참여 특성에 맞는 지도 경험을 축적해 왔습니다.',
      image: SPOKEDU_IMAGES.home.fieldEditorialHero,
    },
    {
      number: '02', label: '02. 우리의 교육 방식',
      title: ['교육의 전문성은', '실제 수업을 운영하는 과정에서 드러납니다.'],
      body: '아이의 발달 수준과 과제 이해 정도를 살피고 수업 공간과 참여 인원에 맞게 활동을 구성합니다. 전문 지도자가 현장에서 움직임을 관찰하며 과제의 난이도와 지도 방식을 조정합니다.',
      image: SPOKEDU_IMAGES.dispatch.groupClass,
    },
    {
      number: '03', label: '03. 우리의 발자취',
      title: ['현장의 경험이 쌓이며', '교육의 영역도 넓어졌습니다.'],
      body: '학교와 키움센터에서 시작한 체육교육은 복지기관·가족 체육·특수체육 등 다양한 현장으로 확대됐습니다. 축적된 수업 경험을 바탕으로 4MOVE 교육과정과 SPOMOVE 콘텐츠를 발전시키고 지도자의 수업 자료 활용을 지원하는 SPOKEDU LAB으로 교육 지원 영역을 확장하고 있습니다.',
      image: SPOKEDU_IMAGES.home.fieldEditorialCaseGeneral,
    },
  ] as const,

  classGuide: {
    titleLines: ['SPOKEDU와 함께', '아이에게 맞는 체육교육을 만들어갑니다.'],
    description: '아이의 발달 수준과 교육 현장의 조건에 맞는 수업을 확인해 보세요.',
    href: SPOKEDU_PATHS.private, label: '개인·소그룹 수업',
    secondary: { href: SPOKEDU_PATHS.education, label: '기관·학교 체육교육' },
  },

  intro: {
    id: 'intro',
    eyebrow: '스포키듀 소개',
    titleLines: ['현장에서 시작한 체육교육을', '교육과정과 시스템으로 발전시킵니다.'] as const,
    lead: '스포키듀는 아동·청소년 전문 체육교육 브랜드입니다.',
    body:
      '스포키듀는 2020년 설립 이후 아동·청소년 체육수업을 직접 운영해 왔습니다. 실제 수업에서 축적한 경험을 바탕으로 교육과정과 지도자용 콘텐츠를 발전시키고 있습니다.',
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
        body: PUBLIC_PROGRAM_COPY.spomove,
        href: `${SPOKEDU_PATHS.spomove}`,
        trackLabel: 'about-what-spomove',
      },
      {
        id: 'subscription',
        title: 'SPOKEDU LAB',
        body: PUBLIC_PROGRAM_COPY.lab,
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
    eyebrow: '함께하는 사람들',
    title: '교육을 설계하고 현장을 움직이는 사람들',
    description: 'SPOKEDU의 교육과정과 현장 운영을 책임지는 전문 운영진을 소개합니다.',
    members: [
      {
        id: 'choi',
        name: HOME_SECTION03_PEOPLE[0]!.name,
        role: PUBLIC_TEAM_ROLES.choi,
        photo: HOME_SECTION03_PEOPLE[0]!.photo,
        photoObjectPosition: '50% top',
        credentials: [...HOME_SECTION03_PEOPLE[0]!.credentials],
        degree: '연세대학교 체육교육학과',
        mainRole: '경영·교육 방향 총괄',
        photoScale: 1,
        detailEducation: aboutFounder.credentials[0],
        qualifications: [aboutFounder.credentials[1]],
        experience: aboutFounder.credentials.slice(2),
      },
      {
        id: 'kim-yunki',
        name: HOME_SECTION03_PEOPLE[1]!.name,
        role: PUBLIC_TEAM_ROLES['kim-yunki'],
        photo: HOME_SECTION03_PEOPLE[1]!.photo,
        photoObjectPosition: '50% top',
        credentials: [...HOME_SECTION03_PEOPLE[1]!.credentials],
        degree: '연세대학교 체육교육학과',
        mainRole: '교육 운영·현장 관리',
        photoScale: 1.04,
        detailEducation: HOME_SECTION03_PEOPLE[1]!.credentials[0]!,
        qualifications: HOME_SECTION03_PEOPLE[1]!.credentials.slice(1),
        experience: [],
      },
      {
        id: 'kim-gumin',
        name: HOME_SECTION03_PEOPLE[2]!.name,
        role: PUBLIC_TEAM_ROLES['kim-gumin'],
        photo: HOME_SECTION03_PEOPLE[2]!.photo,
        photoObjectPosition: '50% top',
        credentials: [...HOME_SECTION03_PEOPLE[2]!.credentials],
        degree: '강원대학교 레저스포츠학과',
        mainRole: '수업 운영·현장 지도',
        photoScale: 1.06,
        detailEducation: HOME_SECTION03_PEOPLE[2]!.credentials[0]!,
        qualifications: HOME_SECTION03_PEOPLE[2]!.credentials.slice(1),
        experience: [],
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

/** Curated summaries of selected canonical records; never rewrite yearGroups to merge years. */
export function getAboutHistoryHighlights() {
  const groups = aboutPage.history.yearGroups;
  const select = (years: readonly string[]) => groups.filter(group => years.includes(group.year));
  const highlights = [
    { years: ['2020'], year: '2020', text: 'SPOKEDU 설립 및 아동·청소년 체육교육 시작' },
    { years: ['2021'], year: '2021', text: '종로·성북 거점형 키움센터 체육교육 운영 시작' },
    { years: ['2023'], year: '2023', text: 'KBS 「슈퍼맨이 돌아왔다」 체력측정 자문 출연 및 동작거점형 키움센터 체육교육 운영 시작' },
    { years: ['2024', '2025'], year: '2024~2025', text: '복지기관·가족 체육·학교 체육교육 및 특수체육 운영 확대' },
    { years: ['2026'], year: '2026', text: '서울시·중구 찾아가는 동행 체육교실 등 공공 체육교육 사업 확대' },
  ];
  return highlights.map(({ years, ...highlight }) => ({ ...highlight, sourceGroups: select(years) }))
    .filter(highlight => highlight.sourceGroups.length > 0);
}
