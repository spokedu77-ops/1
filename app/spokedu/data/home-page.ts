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
    subtitle:
      'SPOKEDU는 아이들의 움직임을 교육적으로 설계하고, 그 경험을 수업·커리큘럼·콘텐츠로 확장합니다.',
    audienceLine: '학부모 · 기관 · 강사·파트너를 위한 아동·청소년 체육교육',
  },
  heroCtas: {
    primary: {
      label: '필요한 수업 방향 찾기',
      href: '#visitor-gate',
      trackLabel: 'cta-home-direction-hero',
    },
    secondary: [
      {
        label: '기관 수업 제안',
        href: `${SPOKEDU_BASE_PATH}/dispatch`,
        trackLabel: 'cta-home-dispatch-hero',
      },
      {
        label: '커리큘럼 문의',
        href: `${SPOKEDU_BASE_PATH}/curriculum`,
        trackLabel: 'cta-home-curriculum-hero',
      },
    ],
  },
  visitorGate: {
    id: 'visitor-gate',
    title: '어떤 방향이 필요하신가요?',
    cards: [
      {
        audience: '학부모라면',
        title: '개인·소그룹 체육수업',
        description: '아이의 성향과 수준에 맞춘 움직임 수업',
        href: `${SPOKEDU_BASE_PATH}/private`,
        trackLabel: 'cta-home-gate-private',
      },
      {
        audience: '기관 담당자라면',
        title: '기관 파견 체육교육',
        description: '정규수업, 원데이, 캠프까지 공간에 맞춘 프로그램',
        href: `${SPOKEDU_BASE_PATH}/dispatch`,
        trackLabel: 'cta-home-gate-dispatch',
      },
      {
        audience: '강사·파트너라면',
        title: '커리큘럼·콘텐츠',
        description: '수업안, 매뉴얼, 강사교육, 프로그램 라이선싱',
        href: `${SPOKEDU_BASE_PATH}/curriculum`,
        trackLabel: 'cta-home-gate-curriculum',
      },
    ] satisfies HomeVisitorGateCard[],
  },
  fieldRecords: {
    title: '현장에서 검증된 수업을 기록합니다',
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
    title: '수업은 프로그램이 되고,\n프로그램은 커리큘럼이 됩니다',
    subtitle: '스포키듀는 현장에서 검증한 수업을 프로그램·콘텐츠 자산으로 확장합니다.',
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
        description: '보고 판단하고 반응하는 에듀테크 체육',
        mediaKey: 'programSpomove',
        href: `${SPOKEDU_BASE_PATH}/programs/spomove`,
        trackLabel: 'cta-home-system-spomove',
      },
      {
        id: 'paps',
        name: 'PAPS',
        description: '초등 기초체력을 놀이로 경험하는 수업',
        mediaKey: 'programPaps',
        href: `${SPOKEDU_BASE_PATH}/programs/paps`,
        trackLabel: 'cta-home-system-paps',
      },
      {
        id: 'oneday',
        name: '원데이',
        description: '기관 행사와 특별활동에 맞춘 체육 프로그램',
        mediaKey: 'programOneday',
        href: `${SPOKEDU_BASE_PATH}/programs/oneday-event`,
        trackLabel: 'cta-home-system-oneday',
      },
      {
        id: 'camp',
        name: '방학캠프',
        description: '체육과 예체능을 결합한 초등 캠프',
        mediaKey: 'programCamp',
        href: `${SPOKEDU_BASE_PATH}/programs/camp`,
        trackLabel: 'cta-home-system-camp',
      },
      {
        id: 'curriculum',
        name: '커리큘럼 콘텐츠',
        description: '수업안, 매뉴얼, 강사교육 콘텐츠',
        mediaKey: 'programCurriculum',
        href: `${SPOKEDU_BASE_PATH}/curriculum`,
        trackLabel: 'cta-home-system-curriculum',
      },
    ] satisfies HomeProgramSystemItem[],
  },
  finalCta: {
    title: '스포키듀와 함께할 방향을 선택하세요',
    links: [
      {
        label: '개인수업 보기',
        href: `${SPOKEDU_BASE_PATH}/private`,
        trackLabel: 'cta-home-private-final',
      },
      {
        label: '기관수업 보기',
        href: `${SPOKEDU_BASE_PATH}/dispatch`,
        trackLabel: 'cta-home-dispatch-final',
      },
      {
        label: '커리큘럼 보기',
        href: `${SPOKEDU_BASE_PATH}/curriculum`,
        trackLabel: 'cta-home-curriculum-final',
      },
    ],
    contact: {
      label: '문의 유형 선택하기',
      href: `${SPOKEDU_BASE_PATH}/contact`,
      trackLabel: 'cta-home-contact-final',
    },
  },
} as const;
