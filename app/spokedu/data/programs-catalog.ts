import { programCatalogImages, SPOKEDU_IMAGES } from './images';

export type ProgramTrack = 'Private' | 'Dispatch' | 'Curriculum';

export type ProgramCatalogCard = {
  slug: string;
  title: string;
  description: string;
  tracks: ProgramTrack[];
  effects: string[];
  image: string;
  imageAlt: string;
  imageAssetId: string;
  ctaLabel: string;
  ctaHref: string;
  ctaTrack: string;
};

const catalogMeta: Omit<ProgramCatalogCard, 'image' | 'imageAlt' | 'imageAssetId'>[] = [
  {
    slug: 'spomove',
    title: 'SPOMOVE',
    description: '보고, 선택하고, 판단하고, 움직이는 빔 기반 에듀테크 놀이체육',
    tracks: ['Private', 'Dispatch', 'Curriculum'],
    effects: ['집중력', '반응속도', '타이밍', '방향전환'],
    ctaLabel: '자세히 보기',
    ctaHref: '/spokedu/programs/spomove',
    ctaTrack: 'cta-program-spomove',
  },
  {
    slug: 'paps',
    title: 'PAPS 연계 놀이체육',
    description: '초등 기초체력 요소를 놀이체육으로 경험하는 프로그램',
    tracks: ['Dispatch', 'Curriculum'],
    effects: ['심폐지구력', '근력', '유연성', '순발력'],
    ctaLabel: '자세히 보기',
    ctaHref: '/spokedu/programs/paps',
    ctaTrack: 'cta-program-paps',
  },
  {
    slug: 'play-class',
    title: '놀이체육 정규수업',
    description: '기본 움직임과 운동 습관을 만드는 기본 수업 자산',
    tracks: ['Private', 'Dispatch'],
    effects: ['기본움직임', '운동습관', '자신감', '사회성'],
    ctaLabel: '문의하기',
    ctaHref: '/spokedu/contact',
    ctaTrack: 'cta-program-inquiry-play-class',
  },
  {
    slug: 'oneday-event',
    title: '원데이 체육행사',
    description: '어린이날, 시즌 행사, 기관 특별활동에 맞춘 체육 프로그램',
    tracks: ['Dispatch'],
    effects: ['몰입', '협동', '체험', '단체활동'],
    ctaLabel: '자세히 보기',
    ctaHref: '/spokedu/programs/oneday-event',
    ctaTrack: 'cta-program-oneday-event',
  },
  {
    slug: 'camp',
    title: '방학캠프',
    description: '체육과 예체능을 결합한 방학 시즌 프로그램',
    tracks: ['Private', 'Dispatch'],
    effects: ['종일체험', '예체능', '돌봄', '신체활동'],
    ctaLabel: '자세히 보기',
    ctaHref: '/spokedu/programs/camp',
    ctaTrack: 'cta-program-camp',
  },
  {
    slug: 'curriculum-content',
    title: '커리큘럼 콘텐츠',
    description: '수업안, 교구 활용법, 월간 프로그램, 강사 교육 콘텐츠',
    tracks: ['Curriculum'],
    effects: ['수업안', '매뉴얼', '강사교육', '라이선싱'],
    ctaLabel: '커리큘럼 문의',
    ctaHref: '/spokedu/curriculum',
    ctaTrack: 'cta-program-curriculum-content',
  },
];

export const programCatalogCards: ProgramCatalogCard[] = catalogMeta.map((item, index) => {
  const asset = programCatalogImages[index];
  return {
    ...item,
    image: asset.src,
    imageAlt: asset.alt,
    imageAssetId: asset.id,
  };
});

export const trackUsageRows = [
  {
    track: 'Private Class' as const,
    label: 'Private',
    summary: '1:1·소그룹 수업에 SPOMOVE·놀이체육·방학캠프 자산을 맞춤 적용합니다.',
    href: '/spokedu/private',
    programs: ['SPOMOVE', '놀이체육', '방학캠프'],
  },
  {
    track: 'Dispatch Solution' as const,
    label: 'Dispatch',
    summary: '기관 정규수업·행사·캠프에 PAPS·원데이·SPOMOVE를 조합해 제안합니다.',
    href: '/spokedu/dispatch',
    programs: ['PAPS', '원데이', 'SPOMOVE', '놀이체육'],
  },
  {
    track: 'Curriculum & Contents' as const,
    label: 'Curriculum',
    summary: '수업안·교구 매뉴얼·강사 교육으로 운영 품질을 표준화합니다.',
    href: '/spokedu/curriculum',
    programs: ['커리큘럼 콘텐츠', 'PAPS', 'SPOMOVE'],
  },
] as const;
