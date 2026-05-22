import type { HomeMediaKey } from './home-media';
import { SPOKEDU_BASE_PATH } from './site';

export type HomeVisitorGateCard = {
  audience: string;
  title: string;
  description: string;
  linkLabel: string;
  href: string;
  trackLabel: string;
};

export type HomeFieldRecordCard = {
  proofId: 'proof-lab' | 'proof-spomove' | 'proof-oneday' | 'proof-camp';
  tagline: string;
  venue: string;
  sessionLine: string;
  href: string;
  trackLabel: string;
};

export type HomeProgramSystemItem = {
  id: string;
  name: string;
  description: string;
  mediaKey: HomeMediaKey;
  href: string;
  trackLabel: string;
  featured?: boolean;
};

export const homePage = {
  hero: {
    lines: ['움직임으로', '아이의 성장을', '설계합니다'] as const,
    subtitle: '현장 수업을 프로그램으로, 프로그램을 커리큘럼과 콘텐츠로 확장하는 아동·청소년 체육교육 운영 브랜드.',
    supportChips: [
      '아이에게는 맞춤 수업',
      '기관에는 운영 프로그램',
      '선생님에게는 커리큘럼 콘텐츠',
    ] as const,
  },
  heroCtas: {
    primary: {
      label: '어떤 수업이 필요한지 보기',
      href: '#visitor-gate',
      trackLabel: 'cta-home-direction-hero',
    },
    secondary: [] as const,
  },
  visitorGate: {
    id: 'visitor-gate',
    title: '어떤 수업이 필요하신가요?',
    lead: '아이 · 기관 · 강사 — 목적에 맞는 수업을 선택하세요.',
    cards: [
      {
        audience: '학부모',
        title: '개인수업',
        description:
          '운동을 어려워하거나 더 체계적으로 배우고 싶은 아이에게 맞춘 1:1·소그룹 수업입니다.',
        linkLabel: '개인수업 보기',
        href: `${SPOKEDU_BASE_PATH}/private`,
        trackLabel: 'cta-home-gate-private',
      },
      {
        audience: '기관',
        title: '기관수업',
        description:
          '공간, 인원, 일정에 맞춰 정규수업·원데이·방학캠프 형태로 운영합니다.',
        linkLabel: '기관수업 보기',
        href: `${SPOKEDU_BASE_PATH}/dispatch`,
        trackLabel: 'cta-home-gate-dispatch',
      },
      {
        audience: '강사·파트너',
        title: '교육 콘텐츠',
        description:
          '수업안, 운영 매뉴얼, 강사교육, 프로그램 콘텐츠로 수업 경험을 확장합니다.',
        linkLabel: '교육 콘텐츠 보기',
        href: `${SPOKEDU_BASE_PATH}/curriculum`,
        trackLabel: 'cta-home-gate-curriculum',
      },
    ] satisfies HomeVisitorGateCard[],
  },
  fieldRecords: {
    title: '현장 기록',
    lead: 'LAB·기관·행사·캠프까지, 스포키듀가 실제로 운영해 온 현장입니다.',
    recordsHref: `${SPOKEDU_BASE_PATH}/records`,
    recordsTrackLabel: 'cta-home-field-records',
    recordsCtaLabel: '현장 기록 더 보기',
    cards: [
      {
        proofId: 'proof-lab',
        tagline: 'LAB',
        venue: '스포키듀 LAB',
        sessionLine: '프로그램 개발 · 강사 교육 운영 허브',
        href: `${SPOKEDU_BASE_PATH}/records`,
        trackLabel: 'cta-home-proof-lab',
      },
      {
        proofId: 'proof-spomove',
        tagline: 'SPOMOVE',
        venue: '양천거점형키움센터',
        sessionLine: '초등 저학년 SPOMOVE 정규수업',
        href: `${SPOKEDU_BASE_PATH}/cases/yangcheon-spomove`,
        trackLabel: 'cta-home-proof-spomove',
      },
      {
        proofId: 'proof-oneday',
        tagline: '원데이',
        venue: '다사랑영등포지역아동센터',
        sessionLine: '지역아동센터 원데이 체육행사',
        href: `${SPOKEDU_BASE_PATH}/cases/dasarang-oneday`,
        trackLabel: 'cta-home-proof-oneday',
      },
      {
        proofId: 'proof-camp',
        tagline: '방학캠프',
        venue: '서울숲 PLAYZ Lounge',
        sessionLine: '방학 원데이 캠프 운영',
        href: `${SPOKEDU_BASE_PATH}/cases/playz-camp`,
        trackLabel: 'cta-home-proof-camp',
      },
    ] satisfies HomeFieldRecordCard[],
  },
  programSystem: {
    title: '수업은 프로그램이 되고,\n프로그램은 커리큘럼이 됩니다',
    lead: '현장에서 검증한 프로그램을, 기관·강사가 바로 운영할 수 있는 형태로 정리합니다.',
    cta: {
      label: '프로그램 살펴보기',
      href: `${SPOKEDU_BASE_PATH}/programs`,
      trackLabel: 'cta-home-programs-system',
    },
    items: [
      {
        id: 'spomove',
        featured: true,
        name: 'SPOMOVE',
        description:
          '시각 자극을 보고 몸으로 반응하는 빔 기반 에듀테크 놀이체육입니다.',
        mediaKey: 'programSpomove',
        href: `${SPOKEDU_BASE_PATH}/programs/spomove`,
        trackLabel: 'cta-home-system-spomove',
      },
      {
        id: 'paps',
        name: 'PAPS',
        description:
          '학교 체력평가 요소를 아이들이 부담 없이 경험하도록 구성한 체력 향상 프로그램입니다.',
        mediaKey: 'programPaps',
        href: `${SPOKEDU_BASE_PATH}/programs/paps`,
        trackLabel: 'cta-home-system-paps',
      },
      {
        id: 'oneday',
        name: '원데이 이벤트',
        description:
          '기관 행사나 특별활동 일정에 맞춰 짧고 몰입감 있는 체육 경험을 제공합니다.',
        mediaKey: 'programOneday',
        href: `${SPOKEDU_BASE_PATH}/programs/oneday-event`,
        trackLabel: 'cta-home-system-oneday',
      },
      {
        id: 'camp',
        name: '방학캠프',
        description:
          '방학 기간 동안 체육과 예체능 활동을 결합해 하루 단위 몰입 프로그램으로 운영합니다.',
        mediaKey: 'programCamp',
        href: `${SPOKEDU_BASE_PATH}/programs/camp`,
        trackLabel: 'cta-home-system-camp',
      },
      {
        id: 'curriculum',
        name: '커리큘럼 콘텐츠',
        description:
          '수업안, 운영 매뉴얼, 강사교육 형태로 스포키듀의 수업 경험을 확장합니다.',
        mediaKey: 'programCurriculum',
        href: `${SPOKEDU_BASE_PATH}/curriculum`,
        trackLabel: 'cta-home-system-curriculum',
      },
    ] satisfies HomeProgramSystemItem[],
  },
  finalCta: {
    title: '목적에 맞는 상담을 선택하세요',
    description:
      '개인·소그룹 수업, 기관 프로그램 제안, 커리큘럼·콘텐츠 협업 — 아래에서 문의 유형을 선택하면 상담 폼으로 바로 연결됩니다.',
    links: [
      {
        label: '개인수업 상담',
        href: `${SPOKEDU_BASE_PATH}/contact?type=private`,
        trackLabel: 'cta-home-private-final',
      },
      {
        label: '기관 제안받기',
        href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
        trackLabel: 'cta-home-dispatch-final',
      },
      {
        label: '콘텐츠 문의',
        href: `${SPOKEDU_BASE_PATH}/contact?type=curriculum`,
        trackLabel: 'cta-home-curriculum-final',
      },
    ],
  },
} as const;
