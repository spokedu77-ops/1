import { SPOKEDU_BASE_PATH } from './content';
import { SPOKEDU_IMAGES } from './images';

export type ProgramCategory = '에듀테크' | '기초체력' | '놀이체육' | '행사형' | '캠프형' | '콘텐츠';
export type ProgramSlug =
  | 'spomove'
  | 'paps'
  | 'oneday-event'
  | 'camp'
  | 'play-class'
  | 'curriculum-content';

export type ProgramData = {
  title: string;
  slug: ProgramSlug;
  category: ProgramCategory;
  description: string;
  connectedTracks: Array<'Private' | 'Dispatch' | 'Curriculum'>;
  effects: string[];
  target: string;
  expandable: boolean;
  detailDescription?: string;
  inquiryHref: string;
  href: string;
  image: string;
  imageAlt: string;
};

export const programCatalog: Record<ProgramSlug, ProgramData> = {
  spomove: {
    title: 'SPOMOVE',
    slug: 'spomove',
    category: '에듀테크',
    description: '보고, 선택하고, 판단하고, 움직이는 빔 기반 에듀테크 놀이체육',
    connectedTracks: ['Private', 'Dispatch', 'Curriculum'],
    effects: ['집중력', '반응속도', '타이밍', '방향전환'],
    target: '기관 단체수업, 방과후, 키움센터, 개인/소그룹 응용',
    expandable: true,
    detailDescription: '보고, 선택하고, 판단하고, 움직이는 빔 기반 에듀테크 놀이체육 프로그램입니다.',
    inquiryHref: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
    href: `${SPOKEDU_BASE_PATH}/programs/spomove`,
    image: SPOKEDU_IMAGES.programs.spomove.src,
    imageAlt: 'SPOMOVE 빔 기반 놀이체육 수업 장면',
  },
  paps: {
    title: 'PAPS',
    slug: 'paps',
    category: '기초체력',
    description: '초등 기초체력 요소를 놀이체육으로 경험하는 프로그램',
    connectedTracks: ['Dispatch', 'Curriculum'],
    effects: ['심폐지구력', '근력', '유연성', '순발력'],
    target: '초등 저학년~고학년 기초체력 경험형 수업',
    expandable: true,
    detailDescription: '초등 기초체력 요소를 놀이체육으로 경험할 수 있도록 설계한 프로그램입니다.',
    inquiryHref: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
    href: `${SPOKEDU_BASE_PATH}/programs/paps`,
    image: SPOKEDU_IMAGES.programs.paps.src,
    imageAlt: 'PAPS 연계 놀이체육 활동 장면',
  },
  'oneday-event': {
    title: '원데이 체육행사',
    slug: 'oneday-event',
    category: '행사형',
    description: '기관 행사와 특별활동에 맞춘 체육 기반 체험 프로그램',
    connectedTracks: ['Dispatch'],
    effects: ['몰입', '협동', '체험', '단체활동'],
    target: '기관 행사, 계절 이벤트, 특별활동',
    expandable: true,
    detailDescription: '어린이날, 시즌 행사, 기관 특별활동에 맞춘 체육 기반 특별 프로그램입니다.',
    inquiryHref: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
    href: `${SPOKEDU_BASE_PATH}/programs/oneday-event`,
    image: SPOKEDU_IMAGES.programs.oneDay.src,
    imageAlt: '원데이 체육행사 단체 활동 장면',
  },
  camp: {
    title: '방학캠프',
    slug: 'camp',
    category: '캠프형',
    description: '체육과 예체능을 결합한 방학 시즌 집중 프로그램',
    connectedTracks: ['Private', 'Dispatch'],
    effects: ['종일체험', '돌봄', '신체활동', '협동'],
    target: '방학 시즌 집중 운영, 기관/공간 연계 캠프',
    expandable: true,
    detailDescription: '체육과 예체능을 결합한 방학 시즌 집중 프로그램입니다.',
    inquiryHref: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
    href: `${SPOKEDU_BASE_PATH}/programs/camp`,
    image: SPOKEDU_IMAGES.programs.camp.src,
    imageAlt: '방학캠프에서 체육과 예체능 활동을 하는 장면',
  },
  'play-class': {
    title: '놀이체육',
    slug: 'play-class',
    category: '놀이체육',
    description: '기본 움직임과 운동 습관을 만드는 스포키듀의 기본 수업 자산',
    connectedTracks: ['Private', 'Dispatch'],
    effects: ['기본움직임', '운동습관', '자신감', '사회성'],
    target: '개인·소그룹 및 기관 정규수업',
    expandable: false,
    inquiryHref: `${SPOKEDU_BASE_PATH}/contact?type=private`,
    href: `${SPOKEDU_BASE_PATH}/contact?type=private`,
    image: SPOKEDU_IMAGES.programs.playClass.src,
    imageAlt: '놀이체육 정규수업에서 아이들이 움직이는 장면',
  },
  'curriculum-content': {
    title: '커리큘럼 콘텐츠',
    slug: 'curriculum-content',
    category: '콘텐츠',
    description: '수업안, 교구 활용법, 월간 프로그램, 강사 교육 콘텐츠',
    connectedTracks: ['Curriculum'],
    effects: ['수업안', '매뉴얼', '강사교육', '라이선싱'],
    target: '강사 교육, 기관 도입, 파트너 제휴/라이선스',
    expandable: false,
    inquiryHref: `${SPOKEDU_BASE_PATH}/contact?type=curriculum`,
    href: `${SPOKEDU_BASE_PATH}/contact?type=curriculum`,
    image: SPOKEDU_IMAGES.programs.curriculumContent.src,
    imageAlt: '커리큘럼 콘텐츠 자료와 수업안이 배치된 장면',
  },
};

export const programs: ProgramData[] = Object.values(programCatalog);

export const expandableProgramSlugs = Object.values(programCatalog)
  .filter((program) => program.expandable)
  .map((program) => program.slug);

export function getProgramBySlug(slug: ProgramSlug) {
  return programCatalog[slug];
}
