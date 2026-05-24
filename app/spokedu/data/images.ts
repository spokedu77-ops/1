/** 실제 사진: `public/images/spokedu/{category}/` — 레지스트리에서 중앙 관리 */

export const SPOKEDU_IMAGE_ROOT = '/images/spokedu';

/** 로딩 실패 시 공통 실사 대체 (SVG 카테고리 fallback 전) */
export const SPOKEDU_FALLBACK_FIELD = `${SPOKEDU_IMAGE_ROOT}/fallback-field.png`;

export type SpokeduImageCategory =
  | 'home'
  | 'private'
  | 'dispatch'
  | 'curriculum'
  | 'programs'
  | 'records'
  | 'cases'
  | 'monthly';

/** `placeholder-copy`: 다른 슬롯 사진 임시 복사 — 전용 실사로 교체 예정 */
export type SpokeduImageAssetStatus = 'production' | 'placeholder-copy';

export type SpokeduImageDef = {
  id: string;
  category: SpokeduImageCategory;
  file: string;
  alt: string;
  src: string;
  fallback: string;
  assetStatus: SpokeduImageAssetStatus;
  /** assetStatus가 placeholder-copy일 때 교체 안내 */
  placeholderNote?: string;
};

type DefineImageOptions = {
  assetStatus?: SpokeduImageAssetStatus;
  placeholderNote?: string;
};

function defineImage(
  category: SpokeduImageCategory,
  id: string,
  file: string,
  alt: string,
  options?: DefineImageOptions,
): SpokeduImageDef {
  const assetStatus = options?.assetStatus ?? 'production';
  return {
    id,
    category,
    file,
    alt,
    src: `${SPOKEDU_IMAGE_ROOT}/${category}/${file}`,
    fallback: `${SPOKEDU_IMAGE_ROOT}/_fallback/${category}.svg`,
    assetStatus,
    ...(assetStatus === 'placeholder-copy' && options?.placeholderNote
      ? { placeholderNote: options.placeholderNote }
      : {}),
  };
}

/** 전용 실사 교체 대상 — 운영·에셋 교체 시 참고 */
export const SPOKEDU_PLACEHOLDER_IMAGE_ASSETS = [
  'cases/hero.jpg',
  'cases/representative.jpg',
] as const;

export const SPOKEDU_IMAGES = {
  home: {
    hero: defineImage(
      'home',
      'home-hero',
      'home-hero-movement.png',
      'KBS 방송 — 스포키듀 아동 신체 측정·체육 프로그램 소개 장면',
    ),
    labScene: defineImage(
      'home',
      'home-lab',
      'home-lab-energy.jpg',
      '스포키듀 LAB 체육관 협찬·프로그램 운영 장면',
    ),
    heroMedia: defineImage(
      'home',
      'home-hero-media',
      'home-hero-media.jpg',
      'KBS 슈돌 방송 — 스포키듀 신체 측정 프로그램 현장',
    ),
    dispatchScene: defineImage('home', 'home-dispatch', 'home-dispatch-scene.jpg', '기관 파견 체육수업 현장 장면'),
  },
  private: {
    oneToOne: defineImage(
      'private',
      'private-1to1',
      'private-coaching.jpg',
      '스포키듀 1:1 개인 체육수업 장면',
    ),
    smallGroup: defineImage('private', 'private-small-group', 'private-small-group.jpg', '스포키듀 2~4명 소그룹 체육수업 장면'),
    toolActivity: defineImage('private', 'private-tool', 'private-tool-activity.jpg', '교구를 활용한 개인·소그룹 체육 활동 장면'),
  },
  dispatch: {
    groupClass: defineImage(
      'dispatch',
      'dispatch-group',
      'dispatch-group-class.jpg',
      '기관 정규 파견 단체 체육수업 장면',
    ),
    kiwoomCenter: defineImage('dispatch', 'dispatch-kiwoom', 'dispatch-institution-class.jpg', '키움센터 체육 프로그램 운영 장면'),
    oneDayEvent: defineImage(
      'dispatch',
      'dispatch-oneday',
      'dispatch-oneday-event.jpg',
      '기관 원데이 체육행사·시즌 행사 운영 장면',
    ),
  },
  curriculum: {
    lessonPlan: defineImage(
      'curriculum',
      'curriculum-plan',
      'curriculum-planning.jpg',
      '체육수업 수업안·커리큘럼 문서 장면',
    ),
    toolSetup: defineImage('curriculum', 'curriculum-tools', 'curriculum-tool-setup.jpg', '체육 교구 세팅 및 활용 안내 장면'),
    instructorTraining: defineImage(
      'curriculum',
      'curriculum-training',
      'curriculum-instructor-training.jpg',
      '스포키듀 강사 교육·워크숍 장면',
    ),
    programMaterials: defineImage('curriculum', 'curriculum-materials', 'curriculum-materials.jpg', '프로그램 운영 자료·콘텐츠 패키지 장면'),
  },
  programs: {
    spomove: defineImage(
      'programs',
      'program-spomove',
      'program-spomove.jpg',
      'SPOMOVE 빔 기반 에듀테크 놀이체육 수업',
    ),
    paps: defineImage(
      'programs',
      'program-paps',
      'program-paps-running.jpg',
      'PAPS 연계 놀이체육 프로그램 수업',
    ),
    playClass: defineImage('programs', 'program-play-class', 'program-play-pe.jpg', '놀이체육 정규수업 장면'),
    oneDay: defineImage(
      'programs',
      'program-oneday',
      'program-oneday.png',
      '원데이 체육행사 프로그램 장면',
    ),
    camp: defineImage(
      'programs',
      'program-camp',
      'program-camp.jpg',
      '방학캠프 체육·예체능 결합 프로그램',
    ),
    curriculumContent: defineImage(
      'programs',
      'program-curriculum',
      'program-curriculum-content.png',
      '커리큘럼 콘텐츠·수업안 자료',
    ),
  },
  records: {
    lab: defineImage('records', 'record-lab', 'lab.jpg', '스포키듀 LAB 운영 기록'),
    yangcheon: defineImage(
      'records',
      'record-yangcheon',
      'yangcheon.jpg',
      '양천거점형키움센터 SPOMOVE 수업 기록',
    ),
    dongjak: defineImage('records', 'record-dongjak', 'dongjak.jpg', '동작거점형키움센터 리듬챌린지 수업 기록'),
    dasarang: defineImage(
      'records',
      'record-dasarang',
      'dasarang.png',
      '다사랑영등포지역아동센터 원데이 행사 기록',
    ),
    playz: defineImage(
      'records',
      'record-playz',
      'playz.jpg',
      'PLAYZ Lounge 방학캠프 기록',
    ),
    seodaemun: defineImage('records', 'record-seodaemun', 'seodaemun.jpg', '서대문형무소 어린이날 체험 부스 기록'),
  },
  cases: {
    hero: defineImage('cases', 'cases-hero', 'hero.jpg', '스포키듀 수업 사례 모음 대표 장면', {
      assetStatus: 'placeholder-copy',
      placeholderNote: '임시: records/yangcheon.jpg 복사본 → Cases Hero 전용 실사로 교체',
    }),
    representative: defineImage('cases', 'cases-rep', 'representative.jpg', '대표 수업 사례 현장 사진', {
      assetStatus: 'placeholder-copy',
      placeholderNote: '임시: dispatch-group-class.jpg 복사본 → Cases 대표 전용 실사로 교체',
    }),
  },
  monthly: {
    hero: defineImage('monthly', 'monthly-hero', 'hero.jpg', '월간 스포키듀 운영 기록 대표 장면'),
    representative: defineImage('monthly', 'monthly-rep', 'representative.jpg', '월간 운영 하이라이트 장면'),
  },
} as const;

/** @deprecated postimg 제거 — 로컬 레지스트리 경로만 사용 */
export const SPOKEDU_LIVE_PHOTOS = {
  homeHero: SPOKEDU_IMAGES.home.hero.src,
  homeHeroAlt: SPOKEDU_IMAGES.home.hero.src,
  lab: SPOKEDU_IMAGES.home.labScene.src,
  spomove: SPOKEDU_IMAGES.programs.spomove.src,
  onedayField: SPOKEDU_IMAGES.dispatch.oneDayEvent.src,
  playzLounge: SPOKEDU_IMAGES.records.playz.src,
  paps: SPOKEDU_IMAGES.programs.paps.src,
  onedayProgram: SPOKEDU_IMAGES.programs.oneDay.src,
  camp: SPOKEDU_IMAGES.programs.camp.src,
  curriculumPackage: SPOKEDU_IMAGES.curriculum.lessonPlan.src,
  gatePrivate: SPOKEDU_IMAGES.private.oneToOne.src,
  gateDispatch: SPOKEDU_IMAGES.dispatch.groupClass.src,
  gateCurriculum: SPOKEDU_IMAGES.curriculum.lessonPlan.src,
} as const;

/** 레거시 문자열 경로 호환 (기존 import 유지) */
export const spokeduImageManifest = {
  home: {
    heroClass: SPOKEDU_IMAGES.home.hero.src,
    labScene: SPOKEDU_IMAGES.home.labScene.src,
    dispatchScene: SPOKEDU_IMAGES.home.dispatchScene.src,
  },
  private: {
    oneToOne: SPOKEDU_IMAGES.private.oneToOne.src,
    smallGroup: SPOKEDU_IMAGES.private.smallGroup.src,
    toolActivity: SPOKEDU_IMAGES.private.toolActivity.src,
  },
  dispatch: {
    groupClass: SPOKEDU_IMAGES.dispatch.groupClass.src,
    kiwoomCenter: SPOKEDU_IMAGES.dispatch.kiwoomCenter.src,
    oneDayEvent: SPOKEDU_IMAGES.dispatch.oneDayEvent.src,
  },
  curriculum: {
    lessonPlan: SPOKEDU_IMAGES.curriculum.lessonPlan.src,
    toolSetup: SPOKEDU_IMAGES.curriculum.toolSetup.src,
    instructorTraining: SPOKEDU_IMAGES.curriculum.instructorTraining.src,
    programMaterials: SPOKEDU_IMAGES.curriculum.programMaterials.src,
  },
  programs: {
    spomove: SPOKEDU_IMAGES.programs.spomove.src,
    paps: SPOKEDU_IMAGES.programs.paps.src,
    playClass: SPOKEDU_IMAGES.programs.playClass.src,
    oneDay: SPOKEDU_IMAGES.programs.oneDay.src,
    camp: SPOKEDU_IMAGES.programs.camp.src,
    curriculumContent: SPOKEDU_IMAGES.programs.curriculumContent.src,
  },
  records: {
    lab: SPOKEDU_IMAGES.records.lab.src,
    yangcheon: SPOKEDU_IMAGES.records.yangcheon.src,
    dongjak: SPOKEDU_IMAGES.records.dongjak.src,
    dasarang: SPOKEDU_IMAGES.records.dasarang.src,
    playz: SPOKEDU_IMAGES.records.playz.src,
    seodaemun: SPOKEDU_IMAGES.records.seodaemun.src,
  },
  cases: {
    hero: SPOKEDU_IMAGES.cases.hero.src,
    representative: SPOKEDU_IMAGES.cases.representative.src,
  },
  monthly: {
    hero: SPOKEDU_IMAGES.monthly.hero.src,
    representative: SPOKEDU_IMAGES.monthly.representative.src,
  },
} as const;

export const spokeduImageFolders = [
  `${SPOKEDU_IMAGE_ROOT}/home`,
  `${SPOKEDU_IMAGE_ROOT}/private`,
  `${SPOKEDU_IMAGE_ROOT}/dispatch`,
  `${SPOKEDU_IMAGE_ROOT}/curriculum`,
  `${SPOKEDU_IMAGE_ROOT}/programs`,
  `${SPOKEDU_IMAGE_ROOT}/records`,
  `${SPOKEDU_IMAGE_ROOT}/cases`,
  `${SPOKEDU_IMAGE_ROOT}/monthly`,
  `${SPOKEDU_IMAGE_ROOT}/_fallback`,
] as const;

export function getSpokeduImageFallback(category: SpokeduImageCategory): string {
  return `${SPOKEDU_IMAGE_ROOT}/_fallback/${category}.svg`;
}

export type PageImageSlot = {
  page: string;
  section: string;
  asset: SpokeduImageDef;
};

/** 페이지별 이미지 슬롯 (운영·교체 참고) */
export const spokeduPageImageMap: PageImageSlot[] = [
  { page: 'Home', section: 'Hero', asset: SPOKEDU_IMAGES.home.hero },
  { page: 'Home', section: 'Living Proof / LAB', asset: SPOKEDU_IMAGES.home.labScene },
  { page: 'Home', section: 'Living Proof / Dispatch', asset: SPOKEDU_IMAGES.home.dispatchScene },
  { page: 'Private', section: 'Hero — 1:1', asset: SPOKEDU_IMAGES.private.oneToOne },
  { page: 'Private', section: '수업 형태 — 소그룹', asset: SPOKEDU_IMAGES.private.smallGroup },
  { page: 'Private', section: '교구 활동', asset: SPOKEDU_IMAGES.private.toolActivity },
  { page: 'Dispatch', section: 'Hero — 기관 수업', asset: SPOKEDU_IMAGES.dispatch.groupClass },
  { page: 'Dispatch', section: '키움·기관 현장', asset: SPOKEDU_IMAGES.dispatch.kiwoomCenter },
  { page: 'Dispatch', section: '원데이 행사', asset: SPOKEDU_IMAGES.dispatch.oneDayEvent },
  { page: 'Curriculum', section: 'Hero — 수업안', asset: SPOKEDU_IMAGES.curriculum.lessonPlan },
  { page: 'Curriculum', section: '교구 세팅', asset: SPOKEDU_IMAGES.curriculum.toolSetup },
  { page: 'Curriculum', section: '강사 교육', asset: SPOKEDU_IMAGES.curriculum.instructorTraining },
  { page: 'Curriculum', section: '프로그램 자료', asset: SPOKEDU_IMAGES.curriculum.programMaterials },
  { page: 'Programs', section: '카탈로그 — SPOMOVE', asset: SPOKEDU_IMAGES.programs.spomove },
  { page: 'Programs', section: '카탈로그 — PAPS', asset: SPOKEDU_IMAGES.programs.paps },
  { page: 'Programs', section: '카탈로그 — 방학캠프', asset: SPOKEDU_IMAGES.programs.camp },
  { page: 'Programs', section: '카탈로그 — 놀이체육', asset: SPOKEDU_IMAGES.programs.playClass },
  { page: 'Programs', section: '카탈로그 — 원데이', asset: SPOKEDU_IMAGES.programs.oneDay },
  { page: 'Programs', section: '카탈로그 — 커리큘럼 콘텐츠', asset: SPOKEDU_IMAGES.programs.curriculumContent },
  { page: 'Records', section: 'Proof — LAB', asset: SPOKEDU_IMAGES.records.lab },
  { page: 'Records', section: 'Featured — 양천', asset: SPOKEDU_IMAGES.records.yangcheon },
  { page: 'Records', section: 'Featured — 동작', asset: SPOKEDU_IMAGES.records.dongjak },
  { page: 'Records', section: 'Featured — 다사랑', asset: SPOKEDU_IMAGES.records.dasarang },
  { page: 'Records', section: 'Featured — PLAYZ', asset: SPOKEDU_IMAGES.records.playz },
  { page: 'Records', section: 'Featured — 서대문', asset: SPOKEDU_IMAGES.records.seodaemun },
];

export const programCatalogImages = [
  SPOKEDU_IMAGES.programs.spomove,
  SPOKEDU_IMAGES.programs.paps,
  SPOKEDU_IMAGES.programs.playClass,
  SPOKEDU_IMAGES.programs.oneDay,
  SPOKEDU_IMAGES.programs.camp,
  SPOKEDU_IMAGES.programs.curriculumContent,
] as const;

export const recordsProofImageAssets = [
  SPOKEDU_IMAGES.records.lab,
  SPOKEDU_IMAGES.private.smallGroup,
  SPOKEDU_IMAGES.dispatch.groupClass,
  SPOKEDU_IMAGES.dispatch.oneDayEvent,
  SPOKEDU_IMAGES.programs.camp,
  SPOKEDU_IMAGES.monthly.hero,
  SPOKEDU_IMAGES.programs.curriculumContent,
] as const;

export const recordsCaseImageBySlug: Record<string, SpokeduImageDef> = {
  'yangcheon-spomove': SPOKEDU_IMAGES.records.yangcheon,
  'dongjak-rhythm': SPOKEDU_IMAGES.records.dongjak,
  'dasarang-oneday': SPOKEDU_IMAGES.records.dasarang,
  'playz-camp': SPOKEDU_IMAGES.records.playz,
  'seodaemun-event-booth': SPOKEDU_IMAGES.records.seodaemun,
};
