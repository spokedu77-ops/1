import type { HomeMediaKey } from './home-media';
import { SPOKEDU_BASE_PATH } from './site';

export const spomoveProgramPage = {
  hero: {
    kicker: '에듀테크 · 인지·신체 반응형 놀이체육',
    lines: ['보고, 판단하고,', '몸으로 반응하는', '에듀테크 놀이체육'] as const,
    subtitle:
      '빔 화면의 색, 위치, 방향, 신호를 보고 아이들이 직접 움직이며 반응하는 스포키듀의 에듀테크 놀이체육 프로그램입니다.',
    mediaKey: 'programSpomove' as HomeMediaKey,
  },
  heroCta: {
    label: 'SPOMOVE 도입 문의하기',
    href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
    trackLabel: 'program-spomove-dispatch-hero',
  },
  overview: {
    title: 'SPOMOVE란',
    body: '빔 화면에 제시되는 색, 위치, 방향, 신호를 보고 아이들이 직접 움직이며 반응하는 빔 기반 에듀테크 놀이체육 프로그램입니다. 화면을 보는 활동이 아니라, 신호를 보고 몸으로 반응하는 수업입니다.',
    flow: ['보고', '선택하고', '판단하고', '움직이는'] as const,
  },
  educationalValues: {
    title: '교육적 가치',
    items: [
      {
        title: '집중력',
        description:
          '화면의 색, 위치, 방향을 끝까지 보고 반응해야 하기 때문에 활동 중 주의 집중이 자연스럽게 이어집니다.',
      },
      {
        title: '반응 선택',
        description:
          '보이는 위치가 아니라 정해진 규칙에 따라 움직이며, 충동적으로 움직이지 않고 선택하는 경험을 합니다.',
      },
      {
        title: '신체 조절',
        description:
          '점프, 방향 전환, 균형, 리듬 움직임을 통해 몸을 조절하는 경험을 쌓습니다.',
      },
    ],
  },
  activities: {
    title: '활동 예시',
    items: [
      {
        title: '리듬챌린지',
        description: '화면 신호에 맞춰 리듬과 타이밍을 유지하며 움직입니다.',
        mediaKey: 'proofCenter' as HomeMediaKey,
      },
      {
        title: '사이먼 효과 활동',
        description: '자극이 나타난 위치가 아니라 정해진 규칙에 따라 반응합니다.',
        mediaKey: 'programSpomove' as HomeMediaKey,
      },
      {
        title: '플랭커 활동',
        description: '주변 자극을 무시하고 중심 자극에 집중해 움직입니다.',
        mediaKey: 'proofClass' as HomeMediaKey,
      },
      {
        title: '컬러 반응 점프',
        description: '색과 방향 신호를 보고 빠르게 선택해 이동합니다.',
        mediaKey: 'trackDispatch' as HomeMediaKey,
      },
    ],
  },
  institutionFit: {
    title: '기관 도입',
    lead: '넓은 체육관이 아니어도 가능합니다.',
    body: '활동실, 강당, 다목적실 등 공간 조건에 맞춰 인원, 동선, 순서를 조정해 운영합니다.',
  },
  classFlow: {
    title: '수업 흐름',
    steps: [
      {
        label: '신호와 규칙 이해',
        detail: '화면에 나오는 색, 위치, 방향 규칙을 먼저 익힙니다.',
      },
      {
        label: '반응 움직임 연습',
        detail: '간단한 점프, 이동, 방향 전환으로 몸을 준비합니다.',
      },
      {
        label: '미션 활동',
        detail: '리듬, 색, 방향, 선택 반응 미션을 수행합니다.',
      },
      {
        label: '난이도 확장',
        detail: '속도, 규칙, 이동 범위를 조절하며 도전합니다.',
      },
    ] as const,
  },
  audience: {
    title: '대상 · 운영 형태',
    targets:
      '초등 저학년부터 중학년까지, 움직임에 몰입하고 반응하는 경험이 필요한 아이들에게 적합합니다.',
    operations:
      '정규수업, 원데이 체험, 기관 행사, 방학 프로그램 안에서 공간과 인원에 맞춰 구성합니다.',
  },
  cases: {
    title: '실제 운영 예시',
    slugs: ['yangcheon-spomove', 'dongjak-rhythm'] as const,
    recordsHref: `${SPOKEDU_BASE_PATH}/records`,
  },
  finalCta: {
    title: 'SPOMOVE를 우리 기관에 맞게 운영하고 싶다면',
    description:
      '공간, 인원, 대상 연령, 운영 일정을 확인한 뒤 적합한 수업 형태로 안내드립니다.',
    label: 'SPOMOVE 도입 문의하기',
    href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
    trackLabel: 'program-spomove-dispatch-final',
  },
} as const;
