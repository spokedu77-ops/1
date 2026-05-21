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
    title: '입구를 선택하세요',
    cards: [
      {
        audience: '학부모',
        title: '개인·소그룹',
        description: '아이 맞춤 체육수업',
        href: `${SPOKEDU_BASE_PATH}/private`,
        trackLabel: 'cta-home-gate-private',
      },
      {
        audience: '기관',
        title: '기관 파견',
        description: '정규·원데이·캠프',
        href: `${SPOKEDU_BASE_PATH}/dispatch`,
        trackLabel: 'cta-home-gate-dispatch',
      },
      {
        audience: '강사·파트너',
        title: '커리큘럼',
        description: '수업안·강사 교육',
        href: `${SPOKEDU_BASE_PATH}/curriculum`,
        trackLabel: 'cta-home-gate-curriculum',
      },
    ] satisfies HomeVisitorGateCard[],
  },
  fieldRecords: {
    title: '실제 운영 기록',
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
        description: '빔 반응 놀이체육',
        mediaKey: 'programSpomove',
        href: `${SPOKEDU_BASE_PATH}/programs/spomove`,
        trackLabel: 'cta-home-system-spomove',
      },
      {
        id: 'paps',
        name: 'PAPS',
        description: '기초체력 놀이체육',
        mediaKey: 'programPaps',
        href: `${SPOKEDU_BASE_PATH}/programs/paps`,
        trackLabel: 'cta-home-system-paps',
      },
      {
        id: 'oneday',
        name: '원데이',
        description: '행사·특별활동',
        mediaKey: 'programOneday',
        href: `${SPOKEDU_BASE_PATH}/programs/oneday-event`,
        trackLabel: 'cta-home-system-oneday',
      },
      {
        id: 'camp',
        name: '방학캠프',
        description: '방학 시즌 캠프',
        mediaKey: 'programCamp',
        href: `${SPOKEDU_BASE_PATH}/programs/camp`,
        trackLabel: 'cta-home-system-camp',
      },
      {
        id: 'curriculum',
        name: '커리큘럼 콘텐츠',
        description: '수업안·매뉴얼',
        mediaKey: 'programCurriculum',
        href: `${SPOKEDU_BASE_PATH}/curriculum`,
        trackLabel: 'cta-home-system-curriculum',
      },
    ] satisfies HomeProgramSystemItem[],
  },
  finalCta: {
    title: '다음 단계',
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
