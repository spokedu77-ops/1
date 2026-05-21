import type { HomeMediaKey } from './home-media';
import { SPOKEDU_BASE_PATH } from './site';

export type HomeVisitorGateCard = {
  audience: string;
  title: string;
  description: string;
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
    subtitle: '아동·청소년 체육교육 브랜드 SPOKEDU.',
  },
  heroCtas: {
    primary: {
      label: '필요한 수업 방향 찾기',
      href: '#visitor-gate',
      trackLabel: 'cta-home-direction-hero',
    },
    secondary: [] as const,
  },
  visitorGate: {
    id: 'visitor-gate',
    title: '어떤 수업이 필요하신가요?',
    cards: [
      {
        audience: '',
        title: '개인수업',
        description: '아이에게 맞춘 1:1·소그룹 체육수업',
        href: `${SPOKEDU_BASE_PATH}/private`,
        trackLabel: 'cta-home-gate-private',
      },
      {
        audience: '',
        title: '기관수업',
        description: '공간과 인원에 맞춘 정규수업·원데이·캠프',
        href: `${SPOKEDU_BASE_PATH}/dispatch`,
        trackLabel: 'cta-home-gate-dispatch',
      },
      {
        audience: '',
        title: '교육 콘텐츠',
        description: '수업안·매뉴얼·강사교육·커리큘럼 콘텐츠',
        href: `${SPOKEDU_BASE_PATH}/curriculum`,
        trackLabel: 'cta-home-gate-curriculum',
      },
    ] satisfies HomeVisitorGateCard[],
  },
  fieldRecords: {
    title: '현장 기록',
    recordsHref: `${SPOKEDU_BASE_PATH}/records`,
    recordsTrackLabel: 'cta-home-field-records',
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
    title: '수업 콘텐츠',
    subtitle: '현장에서 검증한 수업을 프로그램과 콘텐츠로 확장합니다.',
    cta: {
      label: '프로그램 전체 보기',
      href: `${SPOKEDU_BASE_PATH}/programs`,
      trackLabel: 'cta-home-programs-system',
    },
    items: [
      {
        id: 'spomove',
        featured: true,
        name: 'SPOMOVE',
        description: '빔 반응 놀이',
        mediaKey: 'programSpomove',
        href: `${SPOKEDU_BASE_PATH}/programs/spomove`,
        trackLabel: 'cta-home-system-spomove',
      },
      {
        id: 'paps',
        name: 'PAPS',
        description: '기초체력',
        mediaKey: 'programPaps',
        href: `${SPOKEDU_BASE_PATH}/programs/paps`,
        trackLabel: 'cta-home-system-paps',
      },
      {
        id: 'oneday',
        name: '원데이',
        description: '행사형',
        mediaKey: 'programOneday',
        href: `${SPOKEDU_BASE_PATH}/programs/oneday-event`,
        trackLabel: 'cta-home-system-oneday',
      },
      {
        id: 'camp',
        name: '방학캠프',
        description: '방학 캠프',
        mediaKey: 'programCamp',
        href: `${SPOKEDU_BASE_PATH}/programs/camp`,
        trackLabel: 'cta-home-system-camp',
      },
      {
        id: 'curriculum',
        name: '교육 패키지',
        description: '매뉴얼·라이선스',
        mediaKey: 'programCurriculum',
        href: `${SPOKEDU_BASE_PATH}/curriculum`,
        trackLabel: 'cta-home-system-curriculum',
      },
    ] satisfies HomeProgramSystemItem[],
  },
  finalCta: {
    title: '방향 선택',
    links: [
      {
        label: '개인수업',
        href: `${SPOKEDU_BASE_PATH}/private`,
        trackLabel: 'cta-home-private-final',
      },
      {
        label: '기관수업',
        href: `${SPOKEDU_BASE_PATH}/dispatch`,
        trackLabel: 'cta-home-dispatch-final',
      },
      {
        label: '커리큘럼',
        href: `${SPOKEDU_BASE_PATH}/curriculum`,
        trackLabel: 'cta-home-curriculum-final',
      },
    ],
  },
} as const;
