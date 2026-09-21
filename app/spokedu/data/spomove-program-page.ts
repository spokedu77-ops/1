import { dispatchInquiryHref } from './commercial-routes';
import {
  getFieldRecordCatalogItem,
  type FieldRecordSlug,
} from './field-records-catalog';
import type { HomeMediaKey } from './home-media';
import type { SpokeduImageKind, SpokeduImageProgram } from './images';
import { SPOKEDU_BASE_PATH, SPOKEDU_PATHS } from './site';

type SpomoveMediaRequirement = {
  page: 'programs/spomove';
  program: SpokeduImageProgram;
  kind: SpokeduImageKind;
  allowVisualFallback?: boolean;
};

const spomoveMediaRequirement = (
  kind: SpokeduImageKind,
  options?: { allowVisualFallback?: boolean },
): SpomoveMediaRequirement => ({
  page: 'programs/spomove',
  program: 'spomove',
  kind,
  ...(options?.allowVisualFallback ? { allowVisualFallback: true } : {}),
});

/** SPOMOVE 공개 사례 — 사진이 SPOMOVE 적용을 직접 보여주는 건만 */
export const SPOMOVE_LANDING_CASE_SLUGS = ['dongjak-spomove'] as const satisfies readonly FieldRecordSlug[];

export type SpomoveLandingCaseCard = {
  slug: FieldRecordSlug;
  venue: string;
  audience: string;
  operationType: string;
  programLabel: string;
  description: string;
  href: string;
  ctaLabel: string;
  trackLabel: string;
  thumbnailSrc?: string;
  mediaKey: HomeMediaKey;
};

function buildSpomoveCaseCard(slug: FieldRecordSlug): SpomoveLandingCaseCard {
  const item = getFieldRecordCatalogItem(slug);
  return {
    slug: item.slug,
    venue: item.venue,
    audience: item.meta,
    operationType: item.operationType,
    programLabel: item.programLabel,
    description: item.description,
    href: item.href,
    ctaLabel: '사례 보기',
    trackLabel: `spomove-case-${item.slug}`,
    thumbnailSrc: item.thumbnailSrc,
    mediaKey: item.mediaKey,
  };
}

const institutionInquiryHref = dispatchInquiryHref({ program: 'spomove' });

/** SPOMOVE 정적 랜딩 SSOT — 카탈로그/탭 실패와 무관하게 핵심 설명 유지 */
export const spomoveProgramPage = {
  sectionOrder: [
    'hero',
    'flow',
    'experience',
    'variation',
    'audience',
    'cases',
    'spomat',
    'master',
    'catalogFinal',
  ] as const,

  hero: {
    id: 'hero',
    kicker: 'SPOMOVE',
    lines: ['움직임에 반응하는', '시지각 놀이체육'] as const,
    subtitle: '화면의 자극을 보고 판단하고 움직이는 SPOKEDU의 디지털 움직임 프로그램입니다.',
    mediaKey: 'spomoveClassConnected' as HomeMediaKey,
    mediaRequirement: spomoveMediaRequirement('field-photo'),
    primaryCta: {
      label: 'SPOMOVE 체험하기',
      href: '#experience',
      trackLabel: 'spomove-hero-experience',
    },
    secondaryCta: {
      label: '프로그램 보기',
      href: `${SPOKEDU_PATHS.spomoveCatalog}`,
      trackLabel: 'spomove-hero-catalog',
    },
  },

  /** @deprecated 히어로 CTA는 hero.primaryCta — 미디어 테스트·레거시 호환 */
  heroCta: {
    label: '기관 도입 문의',
    href: institutionInquiryHref,
    trackLabel: 'program-spomove-dispatch-hero',
  },

  flow: {
    id: 'flow',
    eyebrow: 'RESPOND',
    titleLines: ['보고,', '판단하고,', '움직입니다.'] as const,
    title: '보고, 판단하고, 움직입니다.',
    mediaKey: 'spomoveColorScreenField' as HomeMediaKey,
    mediaRequirement: spomoveMediaRequirement('field-photo'),
    steps: [
      {
        label: 'SEE',
        axis: 'SCREEN',
        body: '화면에서 색상·방향·형태·동작 자극을 확인합니다.',
      },
      {
        label: 'DECIDE',
        axis: 'DECISION',
        body: '자극을 구분하고 어떤 움직임을 할지 판단합니다.',
      },
      {
        label: 'MOVE',
        axis: 'MOVEMENT',
        body: 'SPOMAT과 공간 위에서 실제 움직임을 수행합니다.',
      },
    ] as const,
  },

  /** @deprecated overview — flow로 이관. 미디어·레거시 호환 */
  overview: {
    title: '화면을 보는 수업이 아닙니다',
    body: '색·위치·방향·리듬을 읽고, 몸이 바로 반응하는 수업입니다.',
    flow: ['확인', '판단', '수행', '조절'] as const,
  },

  content: {
    id: 'content',
    eyebrow: '콘텐츠 구조',
    title: '단순 반응에서 복합 반응까지',
    lead: '반응의 깊이에 따라 콘텐츠를 나눕니다. 세부 테마나 가벼운 동작 하나를 SPOMOVE 전체처럼 일반화하지 않습니다.',
    levels: [
      {
        id: 'simple',
        title: '단순 반응',
        body: '화면에 제시된 한 가지 정보에 맞춰 정해진 위치나 동작으로 연결합니다.',
        tags: ['반응 인지', '시지각 반응'] as const,
      },
      {
        id: 'choice',
        title: '선택 반응',
        body: '여러 정보 중 목표 자극을 골라 움직입니다. 방해 자극이 함께 제시될 수 있습니다.',
        tags: ['사이먼 효과', '플랭커'] as const,
      },
      {
        id: 'complex',
        title: '복합 반응',
        body: '숫자·순서·규칙·교구 조작을 함께 적용하며, 익숙한 반응을 억제하고 규칙을 유지합니다.',
        tags: ['스트룹 과제', '순차 반응'] as const,
      },
    ] as const,
    catalogCta: {
      label: '전체 프로그램 보기',
      href: `${SPOKEDU_PATHS.spomoveCatalog}`,
      trackLabel: 'spomove-content-catalog',
    },
  },

  experience: {
    id: 'experience',
    eyebrow: 'EXPERIENCE',
    titleLines: ['하나의 화면이', '여러 움직임으로 이어집니다.'] as const,
    catalogCta: {
      label: '전체 프로그램 보기',
      href: `${SPOKEDU_PATHS.spomoveCatalog}`,
      trackLabel: 'spomove-experience-catalog',
    },
  },

  variation: {
    id: 'variation',
    eyebrow: 'ADAPT',
    titleLines: ['같은 활동도', '다르게 설계할 수 있습니다.'] as const,
    tracks: [
      { label: '자극 시간', from: '2초', to: '6초' },
      { label: '과제 구조', from: '단순', via: '선택', to: '복합' },
      { label: '참여 방식', from: '1인', via: '협동', to: '그룹' },
      { label: '움직임', from: '기본', to: '복합' },
    ] as const,
  },

  who: {
    id: 'audience',
    eyebrow: 'APPLY',
    titleLines: ['대상에 맞게', '활용합니다.'] as const,
    items: [
      {
        id: 'early',
        label: '유아·초등',
        body: '기본 움직임과 반응 활동을 중심으로 활용합니다.',
        mediaKey: 'spomoveWhoEarly' as HomeMediaKey,
        mediaRequirement: spomoveMediaRequirement('field-photo'),
      },
      {
        id: 'school',
        label: '학교·기관',
        body: '정규수업과 특별활동에 적용할 수 있습니다. 모든 기관수업에 필수는 아닙니다.',
        mediaKey: 'spomoveVariationField' as HomeMediaKey,
        mediaRequirement: spomoveMediaRequirement('field-photo'),
      },
      {
        id: 'adapted',
        label: '특수체육',
        body: '자극시간과 과제 난이도를 조절해 단계적으로 적용합니다.',
        mediaKey: 'spomoveWhoAdapted' as HomeMediaKey,
        mediaRequirement: spomoveMediaRequirement('field-photo'),
      },
      {
        id: 'small',
        label: '느린학습자·소그룹',
        body: '반복과 선택 과제를 통해 참여 수준에 맞춰 운영합니다.',
        mediaKey: 'spomoveWhoSmall' as HomeMediaKey,
        mediaRequirement: spomoveMediaRequirement('field-photo'),
      },
    ] as const,
  },

  /** @deprecated reactionLevels — content.levels 사용. 미디어·레거시 호환 */
  reactionLevels: {
    eyebrow: '난이도',
    title: '단순 반응에서 복합 반응까지',
    lead: '단순 반응부터 선택·복합까지, 기관 대상에 맞춰 조절합니다.',
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
    ] as const,
  },

  /** SPOMAT — 실행 도구 (별도 사업 아님). padSystem 미디어 슬롯 유지 */
  spomat: {
    id: 'spomat',
    eyebrow: 'SPOMAT',
    titleLines: ['화면의 자극을', '실제 움직임으로 연결합니다.'] as const,
    title: '화면의 자극을 실제 움직임으로 연결합니다.',
    body: '2×2 컬러 SPOMAT을 활용해 방향, 위치, 이동, 점프 등 다양한 움직임으로 연결합니다.',
    mediaKey: 'spomovePadSystem' as HomeMediaKey,
    usageMediaKey: 'spomoveColorReactionField' as HomeMediaKey,
    usageMediaRequirement: spomoveMediaRequirement('field-photo'),
    mediaRequirement: spomoveMediaRequirement('product'),
    points: [
      { title: '2×2 구조', body: '네 칸의 위치가 화면 신호와 대응합니다.' },
      { title: '색 위치', body: '위는 빨강·노랑, 아래는 초록·파랑입니다.' },
      { title: '실행 보조', body: '점프·이동·터치 등 실제 움직임을 공간에서 수행하게 합니다.' },
      { title: '난이도 조절', body: '규칙·속도·제시 시간을 수업 목적에 맞춰 바꿉니다.' },
    ] as const,
    note: '구매·요금 안내는 이번 페이지에서 다루지 않습니다.',
    detailHref: `${SPOKEDU_BASE_PATH}/spomat`,
    detailLabel: 'SPOMAT 자세히 보기',
    detailTrackLabel: 'spomove-spomat-detail',
  },

  /** @deprecated padSystem — spomat로 이관. 미디어 테스트 호환 */
  padSystem: {
    eyebrow: '핵심 구조',
    title: 'SPOMAT이 움직임의 기준이 됩니다',
    body: '화면 신호가 발 위치(빨강·노랑 / 초록·파랑)로 이어집니다. SPOMAT은 SPOMOVE 실행을 돕는 도구입니다.',
    mediaKey: 'spomovePadSystem' as HomeMediaKey,
    mediaRequirement: spomoveMediaRequirement('product'),
    points: [
      { title: '확인', body: '색·위치·방향 변화를 읽습니다.' },
      { title: '판단', body: '규칙에 맞는 반응을 고릅니다.' },
      { title: '수행', body: '스텝·점프·터치로 실행합니다.' },
      { title: '조절', body: '속도와 타이밍을 이어갑니다.' },
    ] as const,
  },

  usePaths: {
    id: 'use-paths',
    eyebrow: '이용 방식',
    title: '기관 도입과 구독 이용을 나눕니다',
    lead: 'SPOMOVE는 체육교육 현장과 구독시스템 양쪽에서 활용할 수 있는 콘텐츠입니다. 구독시스템 자체와 동일하지 않습니다.',
    items: [
      {
        id: 'institution',
        badge: '기관·학교·복지시설',
        title: '기관에서 도입하기',
        body: '정규수업, 방학·특강, 특수·포용 체육, 원데이·행사 등에서 기존 체육활동과 조합할 수 있습니다. 모든 기관수업에 필수는 아닙니다.',
        bullets: ['정규·특강', '원데이·행사', '특수·포용', '운영안 협의'] as const,
        ctaLabel: '기관 도입 문의',
        href: institutionInquiryHref,
        trackLabel: 'spomove-path-dispatch',
      },
      {
        id: 'subscription',
        badge: '지도자·센터 운영자',
        title: '구독시스템에서 이용하기',
        body: '구독시스템에서 SPOMOVE 콘텐츠를 확인하고, 놀이체육 자료·수업 흐름과 연결합니다. 실행·기록은 제품 경로에서 이어집니다.',
        bullets: ['콘텐츠 이용', '수업 준비', '현장 실행'] as const,
        ctaLabel: '구독시스템 알아보기',
        href: `${SPOKEDU_PATHS.subscription}`,
        trackLabel: 'spomove-path-curriculum',
      },
    ] as const,
  },

  cases: {
    id: 'cases',
    eyebrow: 'PROVE',
    titleLines: ['실제 수업에서', '사용하고 있습니다.'] as const,
    title: '실제 수업에서 사용하고 있습니다.',
    recordsCta: {
      label: '운영 사례 보기',
      href: `${SPOKEDU_BASE_PATH}/records`,
      trackLabel: 'spomove-cases-records',
    },
    cards: SPOMOVE_LANDING_CASE_SLUGS.map(buildSpomoveCaseCard),
  },

  master: {
    id: 'master',
    eyebrow: 'CONNECT',
    titleLines: ['SPOMOVE 프로그램은', 'SPOKEDU MASTER에서 관리합니다.'] as const,
    body: '프로그램을 찾고 수업에 맞는 활동을 선택해 활용할 수 있습니다.',
    visualSrc: '/images/spokedu/home/field-editorial/home-master-ui.png',
    visualAlt: 'SPOKEDU MASTER 실제 화면 — SPOMOVE 추천',
    objectPosition: '50% 74%',
    primaryCta: {
      label: 'SPOMOVE 프로그램 보기',
      href: `${SPOKEDU_PATHS.spomoveCatalog}`,
      trackLabel: 'spomove-master-catalog',
    },
  },

  /** 활동 예시 — 콘텐츠 섹션 미리보기 + 미디어 테스트 슬롯 */
  activities: {
    title: '프로그램 예시',
    items: [
      {
        title: '색상 반응',
        description: '화면의 색을 보고 해당 위치로 움직입니다.',
        mediaKey: 'spomoveScreenColor' as HomeMediaKey,
        mediaRequirement: spomoveMediaRequirement('screen'),
        fit: 'contain' as const,
      },
      {
        title: '방향 반응',
        description: '자극이 나타난 방향을 보고 이동합니다.',
        mediaKey: 'spomoveScreenDirection' as HomeMediaKey,
        mediaRequirement: spomoveMediaRequirement('screen'),
        fit: 'contain' as const,
      },
      {
        title: '연상 반응',
        description: '이미지와 색을 연결해 반응합니다.',
        mediaKey: 'spomoveAssocField' as HomeMediaKey,
        mediaRequirement: spomoveMediaRequirement('field-photo'),
        fit: 'cover' as const,
      },
      {
        title: '순간 반응',
        description: '짧게 나타난 목표를 보고 바로 움직입니다.',
        mediaKey: 'spomoveScreenFlash' as HomeMediaKey,
        mediaRequirement: spomoveMediaRequirement('screen'),
        fit: 'contain' as const,
      },
      {
        title: '모션게이트',
        description: '화면의 길을 보고 몸을 이동합니다.',
        mediaKey: 'spomoveRhythmField' as HomeMediaKey,
        mediaRequirement: spomoveMediaRequirement('field-photo'),
        fit: 'cover' as const,
      },
      {
        title: '액션 무브',
        description: '화면 속 대상에 전신으로 반응합니다.',
        mediaKey: 'spomoveActionField' as HomeMediaKey,
        mediaRequirement: spomoveMediaRequirement('field-photo'),
        fit: 'cover' as const,
      },
    ],
  },

  catalogFinal: {
    id: 'catalog-final',
    eyebrow: 'START',
    titleLines: ['SPOMOVE를', '수업에 적용해보세요.'] as const,
    title: 'SPOMOVE를 수업에 적용해보세요.',
    catalogCta: {
      label: '전체 프로그램 보기',
      href: `${SPOKEDU_PATHS.spomoveCatalog}`,
      trackLabel: 'spomove-final-catalog',
    },
    materialsLink: {
      label: '교육·특수체육 자료 탭',
      href: `${SPOKEDU_PATHS.spomove}?tab=education`,
      trackLabel: 'spomove-final-tabs',
    },
    primary: {
      label: 'SPOMOVE 이용하기',
      href: `${SPOKEDU_PATHS.subscription}`,
      trackLabel: 'spomove-final-use',
    },
    secondary: {
      label: '도입 문의하기',
      href: institutionInquiryHref,
      trackLabel: 'spomove-final-dispatch',
    },
  },

  cognitiveTasks: {
    eyebrow: '과제 예시',
    title: '규칙에 맞는 반응을 선택하도록 구성합니다',
    lead: '색, 위치, 방향, 글자처럼 서로 다른 정보가 일치하거나 충돌하도록 설계합니다. 현재 규칙에 필요한 정보만 선택해 움직입니다.',
    items: [
      {
        title: '사이먼 효과',
        body: '자극이 나타난 위치와 정답 위치가 다를 때, 보이는 위치로 바로 움직이려는 반응을 멈추고 색 규칙에 맞는 패드를 선택합니다.',
        tags: ['반응 선택', '공간정보 분리', '자동 반응 억제'] as const,
      },
      {
        title: '플랭커',
        body: '가운데 목표 주변의 방해 자극에 흔들리지 않고 중심 목표만 찾아 움직입니다.',
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
    eyebrow: '움직임',
    title: '화면 신호는 실제 움직임 수행으로 이어집니다',
    lead: '화면에서 목표를 확인하는 것만으로 끝나지 않습니다. 선택한 반응을 몸으로 실행해야 SPOMOVE 활동이 완성됩니다.',
    items: [
      { title: '이동하고 멈추기', body: '움직인 뒤 정확한 위치에 멈추고 다음 이동을 준비합니다.' },
      { title: '균형과 자세 조절', body: '스텝, 점프, 방향 전환 과정에서 착지와 무게중심을 조절합니다.' },
      { title: '다양한 교구', body: '공·풍선·컵·콘·후프·원마커·스카프·타격 도구로 손과 발의 움직임을 확장합니다.' },
    ] as const,
  },

  educationalValues: {
    title: '수업에서 다루는 경험',
    items: [
      {
        title: '주의 유지',
        description: '화면의 색, 위치, 방향을 끝까지 확인한 뒤 반응하도록 활동을 구성합니다.',
      },
      {
        title: '반응 선택',
        description: '보이는 위치가 아니라 정해진 규칙에 따라 움직이며, 충동적으로 움직이지 않고 선택하는 경험을 합니다.',
      },
      {
        title: '신체 조절',
        description: '점프, 방향 전환, 균형, 리듬 움직임을 통해 몸을 조절하는 경험을 쌓습니다.',
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

  finalCta: {
    title: 'SPOMOVE를 수업에 적용해보세요.',
    description: '',
    label: '도입 문의하기',
    href: institutionInquiryHref,
    trackLabel: 'program-spomove-dispatch-final',
  },
} as const;
