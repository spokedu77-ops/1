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
  padSystem: {
    eyebrow: 'FOUR-COLOR PAD',
    title: '한 장의 4색 패드가 움직임의 기준이 됩니다.',
    body: '빨강·노랑·초록·파랑의 고정된 공간은 화면의 신호를 실제 발 위치로 연결합니다. 아이는 색을 맞히는 데서 끝나지 않고, 목표 위치를 선택해 이동하고 멈추며 다음 동작을 준비합니다.',
    points: [
      { title: '인지', body: '화면의 색·위치·방향·형태 변화를 확인합니다.' },
      { title: '선택', body: '여러 정보 중 현재 규칙에 필요한 반응을 결정합니다.' },
      { title: '수행', body: '선택한 반응을 스텝·점프·터치·방향 전환으로 실행합니다.' },
      { title: '조절', body: '리듬과 순서에 맞춰 움직임의 속도와 타이밍을 이어갑니다.' },
    ] as const,
  },
  reactionLevels: {
    eyebrow: 'PROGRAM STRUCTURE',
    title: '반응의 수준을 네 가지 영역으로 설계합니다.',
    lead: 'SPOMOVE는 여러 게임을 단순히 모아 놓은 프로그램이 아닙니다. 하나의 자극에 바로 움직이는 단계부터 규칙·억제·기억이 필요한 과제와 몰입형 움직임까지 체계적으로 확장합니다.',
    items: [
      {
        level: '1',
        title: '단순 반응',
        body: '하나의 자극을 보고 정해진 위치나 동작으로 즉시 연결합니다.',
        tags: ['시지각 반응', '반응 인지'] as const,
      },
      {
        level: '2',
        title: '선택 반응',
        body: '여러 자극과 방해 정보 속에서 필요한 목표를 골라 움직입니다.',
        tags: ['사이먼 효과', '플랭커'] as const,
      },
      {
        level: '3',
        title: '복합 반응',
        body: '규칙을 유지하고 익숙한 반응을 억제하며 순서를 기억해 수행합니다.',
        tags: ['스트룹 과제', '순차 기억'] as const,
      },
      {
        level: '4',
        title: '몰입 프로그램',
        body: '화면 속 공간 안에서 달리고, 점프하고, 피하며 전신으로 반응합니다.',
        tags: ['3D DIVE MODE', '몰입형 신체활동'] as const,
      },
    ] as const,
  },
  cognitiveTasks: {
    eyebrow: 'COGNITIVE TASKS',
    title: '일부러 헷갈리게 만들고, 알맞은 반응을 선택하게 합니다.',
    lead: '색, 위치, 방향, 글자처럼 서로 다른 정보가 일치하거나 충돌하도록 설계합니다. 아이는 눈에 먼저 들어오는 정보에 그대로 반응하지 않고, 현재 규칙에 필요한 정보만 선택해 움직입니다.',
    items: [
      {
        title: '사이먼 효과',
        body: '자극이 나타난 위치와 정답 위치가 다를 때, 보이는 위치로 바로 움직이려는 반응을 멈추고 색 규칙에 맞는 패드를 선택합니다.',
        tags: ['반응 선택', '공간정보 분리', '자동 반응 억제'] as const,
      },
      {
        title: '플랭커',
        body: '가운데 목표 주변의 방해 자극에 흔들리지 않고 중심 목표만 찾아 정확하게 움직입니다.',
        tags: ['선택적 주의', '방해 자극 통제', '반응 정확성'] as const,
      },
      {
        title: '스트룹 과제',
        body: '글자의 의미, 글자색, 화살표 방향처럼 충돌하는 정보 중 정해진 기준만 선택해 수행합니다.',
        tags: ['규칙 유지', '반응 억제', '규칙 전환'] as const,
      },
    ] as const,
  },
  movementExpansion: {
    eyebrow: 'MOVEMENT',
    title: '인지 과제는 실제 움직임 기술로 완성됩니다.',
    lead: '화면에서 정답을 찾는 것만으로는 끝나지 않습니다. 선택한 반응을 몸으로 정확히 실행해야 SPOMOVE의 과제가 완성됩니다.',
    items: [
      { title: '이동하고 멈추기', body: '움직인 뒤 정확한 위치에 멈추고 다음 이동을 준비합니다.' },
      { title: '균형과 자세 조절', body: '스텝, 점프, 방향 전환 과정에서 착지와 무게중심을 조절합니다.' },
      { title: '다양한 교구', body: '공·풍선·컵·콘·후프·원마커·스카프·타격 도구로 손과 발의 움직임을 확장합니다.' },
    ] as const,
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
