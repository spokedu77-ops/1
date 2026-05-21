import { SPOKEDU_IMAGES } from './images';
import type { HomeMediaKey } from './home-media';
import { SPOKEDU_BASE_PATH } from './site';

/** /spokedu/programs 목록·링크·트랙 매핑의 단일 기준 */
export type ProgramCategory = '에듀테크' | '기초체력' | '놀이체육' | '행사형' | '캠프형' | '콘텐츠';
export type ProgramSlug =
  | 'spomove'
  | 'paps'
  | 'oneday-event'
  | 'camp'
  | 'play-class'
  | 'curriculum-content';

export type ProgramTrack = 'Private' | 'Dispatch' | 'Curriculum';

export const PROGRAM_DETAIL_SLUGS = ['spomove', 'paps', 'oneday-event', 'camp'] as const;
export type ProgramDetailSlug = (typeof PROGRAM_DETAIL_SLUGS)[number];

export type ProgramRegistryItem = {
  slug: ProgramSlug;
  title: string;
  category: ProgramCategory;
  /** 목록 카드·요약용 짧은 설명 */
  listDescription: string;
  tracks: ProgramTrack[];
  effects: string[];
  target: string;
  hasDetailPage: boolean;
  /** 카드·관련 링크 목적지 (상세 slug 또는 contact/curriculum) */
  detailHref: string;
  inquiryHref: string;
  listCtaLabel: string;
  listCtaTrack: string;
  mediaKey: HomeMediaKey;
};

const programImages = {
  spomove: SPOKEDU_IMAGES.programs.spomove,
  paps: SPOKEDU_IMAGES.programs.paps,
  'play-class': SPOKEDU_IMAGES.programs.playClass,
  'oneday-event': SPOKEDU_IMAGES.programs.oneDay,
  camp: SPOKEDU_IMAGES.programs.camp,
  'curriculum-content': SPOKEDU_IMAGES.programs.curriculumContent,
} as const satisfies Record<ProgramSlug, (typeof SPOKEDU_IMAGES.programs)[keyof typeof SPOKEDU_IMAGES.programs]>;

/** 표시 순서 = 목록 페이지 카드 순서 */
export const programRegistry: ProgramRegistryItem[] = [
  {
    slug: 'spomove',
    title: 'SPOMOVE',
    category: '에듀테크',
    listDescription: '빔 반응 에듀테크 놀이',
    tracks: ['Private', 'Dispatch', 'Curriculum'],
    effects: ['집중력', '반응속도', '타이밍', '방향전환'],
    target: '키움센터·방과후, 개인·소그룹 응용, 혼합 연령 기관 수업',
    hasDetailPage: true,
    detailHref: `${SPOKEDU_BASE_PATH}/programs/spomove`,
    inquiryHref: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
    listCtaLabel: '자세히 보기',
    listCtaTrack: 'cta-program-spomove',
    mediaKey: 'programSpomove',
  },
  {
    slug: 'paps',
    title: 'PAPS',
    category: '기초체력',
    listDescription: '기초체력 놀이 모듈',
    tracks: ['Dispatch', 'Curriculum'],
    effects: ['심폐지구력', '근력', '유연성', '순발력'],
    target: '초등 저·고학년, 기관 정규수업, 체력 경험형 프로그램',
    hasDetailPage: true,
    detailHref: `${SPOKEDU_BASE_PATH}/programs/paps`,
    inquiryHref: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
    listCtaLabel: '자세히 보기',
    listCtaTrack: 'cta-program-paps',
    mediaKey: 'programPaps',
  },
  {
    slug: 'play-class',
    title: '놀이체육',
    category: '놀이체육',
    listDescription: '기본 수업 자산',
    tracks: ['Private', 'Dispatch'],
    effects: ['기본움직임', '운동습관', '자신감', '사회성'],
    target: '개인·소그룹 및 기관 정규수업',
    hasDetailPage: false,
    detailHref: `${SPOKEDU_BASE_PATH}/contact?type=private`,
    inquiryHref: `${SPOKEDU_BASE_PATH}/contact?type=private`,
    listCtaLabel: '문의하기',
    listCtaTrack: 'cta-program-inquiry-play-class',
    mediaKey: 'programPlay',
  },
  {
    slug: 'oneday-event',
    title: '원데이 체육행사',
    category: '행사형',
    listDescription: '행사·특별활동형',
    tracks: ['Dispatch'],
    effects: ['몰입', '협동', '체험', '단체활동'],
    target: '지역아동센터 행사, 어린이날·시즌 이벤트, 기관 특별활동',
    hasDetailPage: true,
    detailHref: `${SPOKEDU_BASE_PATH}/programs/oneday-event`,
    inquiryHref: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
    listCtaLabel: '자세히 보기',
    listCtaTrack: 'cta-program-oneday-event',
    mediaKey: 'programOneday',
  },
  {
    slug: 'camp',
    title: '방학캠프',
    category: '캠프형',
    listDescription: '체육과 예체능을 결합한 방학 시즌 프로그램',
    tracks: ['Private', 'Dispatch'],
    effects: ['종일체험', '예체능', '돌봄', '신체활동'],
    target: '방학 집중 프로그램, 키즈 복합공간, 기관·공간 연계 캠프',
    hasDetailPage: true,
    detailHref: `${SPOKEDU_BASE_PATH}/programs/camp`,
    inquiryHref: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
    listCtaLabel: '자세히 보기',
    listCtaTrack: 'cta-program-camp',
    mediaKey: 'programCamp',
  },
  {
    slug: 'curriculum-content',
    title: '커리큘럼 콘텐츠',
    category: '콘텐츠',
    listDescription: '수업안·매뉴얼·강사 교육',
    tracks: ['Curriculum'],
    effects: ['수업안', '매뉴얼', '강사교육', '라이선싱'],
    target: '강사 교육, 기관 도입, 파트너 제휴/라이선스',
    hasDetailPage: false,
    detailHref: `${SPOKEDU_BASE_PATH}/curriculum`,
    inquiryHref: `${SPOKEDU_BASE_PATH}/contact?type=curriculum`,
    listCtaLabel: '커리큘럼 문의',
    listCtaTrack: 'cta-program-curriculum-content',
    mediaKey: 'programCurriculum',
  },
];

export const programBySlug: Record<ProgramSlug, ProgramRegistryItem> = Object.fromEntries(
  programRegistry.map((item) => [item.slug, item]),
) as Record<ProgramSlug, ProgramRegistryItem>;

export function getProgramRegistryItem(slug: ProgramSlug): ProgramRegistryItem | undefined {
  return programBySlug[slug];
}

export function getProgramImageAsset(slug: ProgramSlug) {
  return programImages[slug];
}

export type ProgramCatalogCard = {
  slug: ProgramSlug;
  title: string;
  description: string;
  tracks: ProgramTrack[];
  effects: string[];
  image: string;
  imageAlt: string;
  imageAssetId: string;
  mediaKey: HomeMediaKey;
  ctaLabel: string;
  ctaHref: string;
  ctaTrack: string;
};

export const programCatalogCards: ProgramCatalogCard[] = programRegistry.map((item) => {
  const asset = programImages[item.slug];
  return {
    slug: item.slug,
    title: item.title,
    description: item.listDescription,
    tracks: item.tracks,
    effects: item.effects,
    image: asset.src,
    imageAlt: asset.alt,
    imageAssetId: asset.id,
    mediaKey: item.mediaKey,
    ctaLabel: item.listCtaLabel,
    ctaHref: item.detailHref,
    ctaTrack: item.listCtaTrack,
  };
});

export const trackUsageRows = [
  {
    track: 'Private Class' as const,
    label: 'Private',
    summary: 'SPOMOVE·놀이체육·방학캠프 맞춤 적용.',
    href: '/spokedu/private',
    programs: ['SPOMOVE', '놀이체육', '방학캠프'],
  },
  {
    track: 'Dispatch Solution' as const,
    label: 'Dispatch',
    summary: 'PAPS·원데이·SPOMOVE 조합 제안.',
    href: '/spokedu/dispatch',
    programs: ['PAPS', '원데이', 'SPOMOVE', '놀이체육'],
  },
  {
    track: 'Curriculum & Contents' as const,
    label: 'Curriculum',
    summary: '수업안·매뉴얼·강사 교육 패키지.',
    href: '/spokedu/curriculum',
    programs: ['커리큘럼 콘텐츠', 'PAPS', 'SPOMOVE'],
  },
] as const;
