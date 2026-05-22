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
    support:
      '아이에게는 맞춤 수업을, 기관에는 운영 가능한 프로그램을, 선생님에게는 커리큘럼 콘텐츠를 제공합니다.',
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
        title: '개인·소그룹',
        description:
          '아이의 속도와 경험에 맞춘 1:1·소그룹 수업으로, 움직임 습관과 자신감을 차근차근 쌓습니다.',
        linkLabel: '개인·소그룹 수업 보기',
        href: `${SPOKEDU_BASE_PATH}/private`,
        trackLabel: 'cta-home-gate-private',
      },
      {
        audience: '기관',
        title: '기관 파견',
        description:
          '키움센터·학교·복지기관 현장에 맞춰 정규수업, 원데이, 방학캠프를 운영 가능한 프로그램으로 제안합니다.',
        linkLabel: '기관 프로그램 보기',
        href: `${SPOKEDU_BASE_PATH}/dispatch`,
        trackLabel: 'cta-home-gate-dispatch',
      },
      {
        audience: '강사·파트너',
        title: '커리큘럼',
        description:
          '수업안·운영 매뉴얼·교구 콘텐츠·강사 교육으로 현장 수업을 브랜드 단위로 확장할 수 있습니다.',
        linkLabel: '커리큘럼 콘텐츠 보기',
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
        href: `${SPOKEDU_BASE_PATH}/records`,
        trackLabel: 'cta-home-proof-lab',
      },
      {
        proofId: 'proof-spomove',
        tagline: 'SPOMOVE',
        href: `${SPOKEDU_BASE_PATH}/cases/yangcheon-spomove`,
        trackLabel: 'cta-home-proof-spomove',
      },
      {
        proofId: 'proof-oneday',
        tagline: '원데이',
        href: `${SPOKEDU_BASE_PATH}/cases/dasarang-oneday`,
        trackLabel: 'cta-home-proof-oneday',
      },
      {
        proofId: 'proof-camp',
        tagline: '방학캠프',
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
          '화면 신호에 맞춰 보고·판단·움직이는 빔 기반 놀이체육으로, 참여와 집중을 동시에 끌어올립니다.',
        mediaKey: 'programSpomove',
        href: `${SPOKEDU_BASE_PATH}/programs/spomove`,
        trackLabel: 'cta-home-system-spomove',
      },
      {
        id: 'paps',
        name: 'PAPS',
        description:
          '초등 기초체력 요소를 놀이로 풀어, 체력 향상과 수업 참여 경험을 함께 설계합니다.',
        mediaKey: 'programPaps',
        href: `${SPOKEDU_BASE_PATH}/programs/paps`,
        trackLabel: 'cta-home-system-paps',
      },
      {
        id: 'oneday',
        name: '원데이',
        description:
          '기관 행사 일정에 맞춰 협동 미션과 체육 활동을 짧고 강하게 구성합니다.',
        mediaKey: 'programOneday',
        href: `${SPOKEDU_BASE_PATH}/programs/oneday-event`,
        trackLabel: 'cta-home-system-oneday',
      },
      {
        id: 'camp',
        name: '방학캠프',
        description:
          '방학 기간 동안 체육과 예체능 활동을 결합해 하루 단위 몰입 경험을 만듭니다.',
        mediaKey: 'programCamp',
        href: `${SPOKEDU_BASE_PATH}/programs/camp`,
        trackLabel: 'cta-home-system-camp',
      },
      {
        id: 'curriculum',
        name: '커리큘럼 콘텐츠',
        description:
          '수업안·운영 매뉴얼·교구 활용 가이드로 강사가 바로 현장에 적용할 수 있게 돕습니다.',
        mediaKey: 'programCurriculum',
        href: `${SPOKEDU_BASE_PATH}/curriculum`,
        trackLabel: 'cta-home-system-curriculum',
      },
    ] satisfies HomeProgramSystemItem[],
  },
  finalCta: {
    title: '목적에 맞는 상담을 선택하세요',
    description:
      '학부모는 개인·소그룹, 기관은 프로그램 제안, 강사·파트너는 커리큘럼 콘텐츠 문의로 바로 연결됩니다.',
    links: [
      {
        label: '개인수업 상담',
        href: `${SPOKEDU_BASE_PATH}/private`,
        trackLabel: 'cta-home-private-final',
      },
      {
        label: '기관 제안받기',
        href: `${SPOKEDU_BASE_PATH}/dispatch`,
        trackLabel: 'cta-home-dispatch-final',
      },
      {
        label: '콘텐츠 문의',
        href: `${SPOKEDU_BASE_PATH}/curriculum`,
        trackLabel: 'cta-home-curriculum-final',
      },
    ],
  },
} as const;
