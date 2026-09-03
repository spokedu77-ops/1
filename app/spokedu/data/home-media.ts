/**
 * Home 전용 미디어 슬롯.
 * 실제 파일: `public/images/spokedu/` — `images.ts`와 동일 경로.
 * src가 null일 때만 CSS gradient visual (깨진 이미지 없음).
 */

import type { SpokeduImageDef } from './images';
import { SPOKEDU_FALLBACK_FIELD, SPOKEDU_IMAGES } from './images';

export type HomeMediaType = 'image' | 'visual';

export type HomeMediaTone = 'indigo' | 'sky' | 'lime' | 'amber' | 'rose' | 'violet' | 'slate';

export type HomeMediaItem = {
  id: string;
  type: HomeMediaType;
  src: string | null;
  /** 로딩 실패 시 SVG·공통 실사 fallback */
  fallbackSrc?: string | null;
  poster: string | null;
  alt: string;
  label: string;
  fallbackGradient: string;
  tone: HomeMediaTone;
  /** object-cover 앵커 (예: Hero KBS 로고 좌상단) */
  objectPosition?: string;
  /** 실제 사진 자산일 때만 이미지 사용 계약 검증에 사용 */
  asset?: SpokeduImageDef;
};

function fromPhoto(
  asset: SpokeduImageDef,
  item: Omit<HomeMediaItem, 'type' | 'src' | 'poster' | 'alt'> & { alt?: string },
): HomeMediaItem {
  return {
    type: 'image',
    src: asset.src,
    /** Home: SVG 카테고리 placeholder 사용 금지 — 실사 공통 fallback만 */
    fallbackSrc: SPOKEDU_FALLBACK_FIELD,
    poster: null,
    alt: item.alt ?? asset.alt,
    asset,
    ...item,
  };
}

function visualMedia(item: Omit<HomeMediaItem, 'type' | 'src' | 'poster' | 'fallbackSrc'>): HomeMediaItem {
  return {
    type: 'visual',
    src: null,
    fallbackSrc: null,
    poster: null,
    ...item,
  };
}

export const HOME_MEDIA = {
  homeHeroField: fromPhoto(SPOKEDU_IMAGES.home.fieldEditorialHero, {
    id: 'home-hero-field',
    label: '체육수업 Hero',
    fallbackGradient: 'from-sky-500 via-blue-700 to-slate-900',
    tone: 'sky',
    /** Left copy zone; crop upper gym wall — keep instructor + children mid-right */
    objectPosition: '58% 62%',
  }),
  /** Same asset as Home Hero; Education uses bottom copy — keep subjects above scrim */
  homeHeroFieldEducation: fromPhoto(SPOKEDU_IMAGES.home.fieldEditorialHero, {
    id: 'home-hero-field-education',
    label: '체육수업 Hero (교육)',
    fallbackGradient: 'from-sky-500 via-blue-700 to-slate-900',
    tone: 'sky',
    /** Bottom copy composition — keep instructor/children clear of left type + bottom scrim */
    objectPosition: '64% 52%',
  }),
  homeSpomoveField: fromPhoto(SPOKEDU_IMAGES.home.fieldEditorialSpomove, {
    id: 'home-spomove-field',
    label: 'SPOMOVE 현장',
    fallbackGradient: 'from-fuchsia-500 via-violet-700 to-slate-900',
    tone: 'violet',
    objectPosition: '62% 56%',
  }),
  homeCaseGeneral: fromPhoto(SPOKEDU_IMAGES.home.fieldEditorialCaseGeneral, {
    id: 'home-case-general',
    label: '일반 체육수업 사례',
    fallbackGradient: 'from-sky-500 via-blue-700 to-slate-900',
    tone: 'sky',
    objectPosition: '40% 32%',
  }),
  homeCaseAdapted: fromPhoto(SPOKEDU_IMAGES.home.fieldEditorialCaseAdapted, {
    id: 'home-case-adapted',
    label: '특수·포용 체육 사례',
    fallbackGradient: 'from-violet-500 via-indigo-700 to-slate-900',
    tone: 'violet',
    objectPosition: '68% 46%',
  }),
  homeCaseSpomove: fromPhoto(SPOKEDU_IMAGES.home.fieldEditorialCaseSpomove, {
    id: 'home-case-spomove',
    label: 'SPOMOVE 운영 사례',
    fallbackGradient: 'from-fuchsia-500 via-violet-700 to-slate-900',
    tone: 'violet',
    objectPosition: '52% 50%',
  }),
  homeHero: fromPhoto(SPOKEDU_IMAGES.home.hero, {
    id: 'home-hero',
    label: '체육수업 현장',
    fallbackGradient: 'from-sky-500 via-blue-700 to-slate-900',
    tone: 'sky',
    /** 지도자·아이 움직임이 카피 영역과 겹치지 않게 */
    objectPosition: '50% 65%',
  }),
  homeHeroMovement: fromPhoto(SPOKEDU_IMAGES.home.heroMovement, {
    id: 'home-hero-movement',
    label: '체육수업 현장',
    fallbackGradient: 'from-sky-500 via-blue-700 to-slate-900',
    tone: 'sky',
    objectPosition: '50% 35%',
  }),
  homeHeroWide: fromPhoto(SPOKEDU_IMAGES.home.heroSpomoveClass, {
    id: 'home-hero-wide',
    label: 'SPOMOVE 기관 수업',
    fallbackGradient: 'from-indigo-600 via-indigo-800 to-slate-900',
    tone: 'indigo',
    objectPosition: '48% 62%',
  }),
  heroThumbMedia: fromPhoto(SPOKEDU_IMAGES.home.heroMedia, {
    id: 'hero-thumb-media',
    label: '방송·미디어',
    fallbackGradient: 'from-violet-500 via-indigo-700 to-slate-900',
    tone: 'violet',
    objectPosition: '50% 20%',
  }),
  trackPrivate: fromPhoto(SPOKEDU_IMAGES.private.oneToOne, {
    id: 'track-private',
    label: '개인·소그룹',
    fallbackGradient: 'from-violet-500 via-indigo-600 to-slate-800',
    tone: 'violet',
    objectPosition: '48% 35%',
  }),
  trackSmallGroup: fromPhoto(SPOKEDU_IMAGES.private.smallGroup, {
    id: 'track-small-group',
    label: '소그룹 수업',
    fallbackGradient: 'from-sky-500 via-cyan-700 to-slate-900',
    tone: 'sky',
    /** 아이·코치 군집이 프레임 중앙에 오도록 */
    objectPosition: '62% 48%',
  }),
  trackDispatch: fromPhoto(SPOKEDU_IMAGES.dispatch.kiwoomCenter, {
    id: 'track-dispatch',
    label: '기관 프로그램',
    fallbackGradient: 'from-sky-500 via-cyan-700 to-slate-900',
    tone: 'sky',
    objectPosition: '50% 42%',
  }),
  trackCurriculum: fromPhoto(SPOKEDU_IMAGES.curriculum.instructorTraining, {
    id: 'track-curriculum',
    label: '지도자 교육',
    fallbackGradient: 'from-emerald-500 via-teal-700 to-slate-900',
    tone: 'lime',
    objectPosition: '50% 38%',
  }),
  curriculumTraining: fromPhoto(SPOKEDU_IMAGES.curriculum.instructorTraining, {
    id: 'curriculum-training',
    label: '지도자 교육',
    fallbackGradient: 'from-teal-500 via-emerald-700 to-slate-900',
    tone: 'lime',
    objectPosition: '50% 38%',
  }),
  curriculumPlan: visualMedia({
    id: 'curriculum-plan',
    alt: '수업안 문서 구조 카드 — 목표, 진행 순서, 변형, 안전 기준',
    label: '수업안',
    fallbackGradient: 'from-emerald-400 via-teal-700 to-slate-950',
    tone: 'lime',
  }),
  curriculumManual: visualMedia({
    id: 'curriculum-manual',
    alt: '운영 매뉴얼 구조 카드 — 준비물, 동선, 안전, 진행 기준',
    label: '운영 매뉴얼',
    fallbackGradient: 'from-sky-400 via-cyan-700 to-slate-950',
    tone: 'sky',
  }),
  curriculumPackage: visualMedia({
    id: 'curriculum-package',
    alt: '커리큘럼 패키지 구조 카드 — 수업안, 교육, 라이선싱 구성',
    label: '라이선싱 패키지',
    fallbackGradient: 'from-indigo-400 via-blue-700 to-slate-950',
    tone: 'indigo',
  }),
  curriculumMaster: visualMedia({
    id: 'curriculum-master',
    alt: 'SPOKEDU MASTER 화면 구조 카드 — 프로그램 라이브러리와 수업 운영 도구',
    label: 'SPOKEDU MASTER',
    fallbackGradient: 'from-violet-500 via-indigo-700 to-slate-950',
    tone: 'violet',
  }),
  proofLab: fromPhoto(SPOKEDU_IMAGES.home.labScene, {
    id: 'proof-lab',
    label: 'LAB',
    fallbackGradient: 'from-indigo-500 via-indigo-700 to-slate-900',
    tone: 'indigo',
  }),
  proofClass: fromPhoto(SPOKEDU_IMAGES.programs.spomove, {
    id: 'proof-class',
    label: 'SPOMOVE',
    fallbackGradient: 'from-sky-400 via-blue-600 to-indigo-950',
    tone: 'sky',
    objectPosition: '50% 48%',
  }),
  proofYangcheon: fromPhoto(SPOKEDU_IMAGES.records.yangcheon, {
    id: 'proof-yangcheon',
    label: '양천 SPOMOVE',
    fallbackGradient: 'from-sky-400 via-blue-600 to-indigo-950',
    tone: 'sky',
    objectPosition: '50% 22%',
  }),
  proofDongjak: fromPhoto(SPOKEDU_IMAGES.records.dongjak, {
    id: 'proof-dongjak',
    label: '동작 SPOMOVE',
    fallbackGradient: 'from-cyan-400 via-teal-600 to-slate-900',
    tone: 'sky',
    objectPosition: '50% 58%',
  }),
  proofDasarang: fromPhoto(SPOKEDU_IMAGES.records.dasarang, {
    id: 'proof-dasarang',
    label: '원데이 행사',
    fallbackGradient: 'from-lime-400 via-emerald-600 to-slate-900',
    tone: 'lime',
  }),
  proofCenter: fromPhoto(SPOKEDU_IMAGES.dispatch.kiwoomCenter, {
    id: 'proof-center',
    label: '기관 수업',
    fallbackGradient: 'from-cyan-400 via-teal-600 to-slate-900',
    tone: 'sky',
    objectPosition: '50% 52%',
  }),
  dispatchSpomove: fromPhoto(SPOKEDU_IMAGES.programs.spomove, {
    id: 'dispatch-spomove',
    label: 'SPOMOVE',
    fallbackGradient: 'from-fuchsia-500 via-violet-700 to-slate-900',
    tone: 'violet',
    objectPosition: '50% 45%',
  }),
  dispatchMonthlySports: visualMedia({
    id: 'dispatch-monthly-sports',
    alt: '월간 뉴스포츠 구성 카드 — 월별 종목 순환과 협동·판단 활동',
    label: '월간 뉴스포츠',
    fallbackGradient: 'from-sky-400 via-cyan-700 to-slate-950',
    tone: 'sky',
  }),
  dispatchSpecialPe: visualMedia({
    id: 'dispatch-special-pe',
    alt: '특수체육 운영 구조 카드 — 단계 조절, 속도 조절, 보조 흐름',
    label: '특수체육',
    fallbackGradient: 'from-violet-500 via-indigo-700 to-slate-950',
    tone: 'violet',
  }),
  dispatchMiniOlympics: visualMedia({
    id: 'dispatch-mini-olympics',
    alt: '미니 올림픽 운영 구조 카드 — 팀 경기, 응원, 시상 흐름',
    label: '미니 올림픽',
    fallbackGradient: 'from-amber-300 via-orange-600 to-slate-950',
    tone: 'amber',
  }),
  dispatchSportsBooth: visualMedia({
    id: 'dispatch-sports-booth',
    alt: '스포츠 부스 운영 구조 카드 — 대기, 순환, 체험 동선',
    label: '스포츠 부스',
    fallbackGradient: 'from-lime-400 via-emerald-700 to-slate-950',
    tone: 'lime',
  }),
  dispatchCustomDesign: visualMedia({
    id: 'dispatch-custom-design',
    alt: '기관 맞춤 설계 구조 카드 — 조건 확인, 프로그램 선택, 동선 설계, 운영안',
    label: '맞춤 설계',
    fallbackGradient: 'from-indigo-400 via-blue-700 to-slate-950',
    tone: 'indigo',
  }),
  proofCommunity: fromPhoto(SPOKEDU_IMAGES.dispatch.oneDayEvent, {
    id: 'proof-community',
    label: '원데이',
    fallbackGradient: 'from-lime-400 via-emerald-600 to-slate-900',
    tone: 'lime',
    objectPosition: '50% 62%',
  }),
  proofLounge: fromPhoto(SPOKEDU_IMAGES.records.playz, {
    id: 'proof-lounge',
    label: '방학캠프',
    fallbackGradient: 'from-amber-300 via-orange-500 to-slate-900',
    tone: 'amber',
  }),
  gateCurriculum: fromPhoto(SPOKEDU_IMAGES.curriculum.instructorTraining, {
    id: 'gate-curriculum',
    label: '강사 교육',
    fallbackGradient: 'from-emerald-500 via-teal-700 to-slate-900',
    tone: 'lime',
    objectPosition: '50% 38%',
  }),
  proofEvent: fromPhoto(SPOKEDU_IMAGES.records.seodaemun, {
    id: 'proof-event',
    label: '체험 부스',
    fallbackGradient: 'from-rose-400 via-pink-600 to-slate-900',
    tone: 'rose',
  }),
  proofMonthly: fromPhoto(SPOKEDU_IMAGES.home.labScene, {
    id: 'proof-monthly',
    label: '월간 기록',
    alt: '월간형 체육수업 운영 기록',
    fallbackGradient: 'from-violet-500 via-indigo-700 to-slate-950',
    tone: 'violet',
  }),
  programSpomove: fromPhoto(SPOKEDU_IMAGES.programs.spomove, {
    id: 'program-spomove',
    label: 'SPOMOVE',
    fallbackGradient: 'from-fuchsia-500 via-violet-700 to-slate-900',
    tone: 'violet',
    objectPosition: '50% 45%',
  }),
  spomoveHeroField: fromPhoto(SPOKEDU_IMAGES.programs.spomoveHeroField, {
    id: 'spomove-hero-field',
    label: 'SPOMOVE 현장',
    fallbackGradient: 'from-fuchsia-500 via-violet-700 to-slate-900',
    tone: 'violet',
    objectPosition: '58% 50%',
  }),
  spomovePadSystem: fromPhoto(SPOKEDU_IMAGES.brand.spomat, {
    id: 'spomove-pad-system',
    label: '4색 패드',
    fallbackGradient: 'from-red-500 via-yellow-500 to-blue-700',
    tone: 'amber',
  }),
  spomoveRhythmField: fromPhoto(SPOKEDU_IMAGES.programs.spomoveRhythmField, {
    id: 'spomove-rhythm-field',
    label: 'DIVE·리듬 현장',
    fallbackGradient: 'from-sky-500 via-blue-700 to-slate-950',
    tone: 'sky',
    objectPosition: '50% 50%',
  }),
  spomoveSimonScreen: visualMedia({
    id: 'spomove-simon-screen',
    alt: 'SPOMOVE 사이먼 효과 화면 구조 — 자극 위치와 정답 색 위치가 충돌하는 과제',
    label: '사이먼 화면',
    fallbackGradient: 'from-red-500 via-violet-700 to-slate-950',
    tone: 'violet',
  }),
  spomoveFlankerScreen: visualMedia({
    id: 'spomove-flanker-screen',
    alt: 'SPOMOVE 플랭커 화면 구조 — 가운데 목표와 주변 방해 자극을 구분하는 과제',
    label: '플랭커 화면',
    fallbackGradient: 'from-blue-500 via-indigo-700 to-slate-950',
    tone: 'indigo',
  }),
  spomoveStroopScreen: visualMedia({
    id: 'spomove-stroop-screen',
    alt: 'SPOMOVE 스트룹 화면 구조 — 글자 의미와 색 정보가 충돌하는 과제',
    label: '스트룹 화면',
    fallbackGradient: 'from-emerald-500 via-teal-700 to-slate-950',
    tone: 'lime',
  }),
  spomoveColorReactionField: fromPhoto(SPOKEDU_IMAGES.programs.spomoveColorReactionField, {
    id: 'spomove-color-reaction-field',
    label: '컬러 반응 현장',
    fallbackGradient: 'from-sky-500 via-blue-700 to-slate-950',
    tone: 'sky',
    objectPosition: '50% 48%',
  }),
  spomoveDiveScreen: visualMedia({
    id: 'spomove-dive-screen',
    alt: 'SPOMOVE DIVE 화면 구조 — 가상 공간의 색 게이트와 장애물을 보고 전신으로 반응하는 과제',
    label: 'DIVE 화면',
    fallbackGradient: 'from-cyan-500 via-blue-800 to-slate-950',
    tone: 'sky',
  }),
  programPaps: fromPhoto(SPOKEDU_IMAGES.programs.paps, {
    id: 'program-paps',
    label: 'PAPS',
    fallbackGradient: 'from-lime-400 via-green-600 to-slate-900',
    tone: 'lime',
  }),
  programMonthlyNewsports: fromPhoto(SPOKEDU_IMAGES.programs.newsportsMonthly, {
    id: 'program-monthly-newsports',
    label: '월간 뉴스포츠',
    fallbackGradient: 'from-sky-400 via-cyan-600 to-slate-900',
    tone: 'sky',
  }),
  programPlay: fromPhoto(SPOKEDU_IMAGES.programs.playClass, {
    id: 'program-play',
    label: '놀이체육',
    fallbackGradient: 'from-amber-300 via-orange-500 to-slate-800',
    tone: 'amber',
  }),
  programOneday: fromPhoto(SPOKEDU_IMAGES.programs.oneDay, {
    id: 'program-oneday',
    label: '원데이',
    fallbackGradient: 'from-sky-400 to-indigo-900',
    tone: 'sky',
  }),
  programCamp: fromPhoto(SPOKEDU_IMAGES.programs.camp, {
    id: 'program-camp',
    label: '방학캠프',
    fallbackGradient: 'from-teal-400 to-slate-900',
    tone: 'lime',
  }),
  programCurriculum: fromPhoto(SPOKEDU_IMAGES.programs.curriculumContent, {
    id: 'program-curriculum',
    label: '커리큘럼',
    alt: SPOKEDU_IMAGES.programs.curriculumContent.alt,
    fallbackGradient: 'from-indigo-400 to-slate-900',
    tone: 'indigo',
  }),
  finalCta: fromPhoto(SPOKEDU_IMAGES.home.dispatchScene, {
    id: 'final-cta',
    label: '상담 연결',
    fallbackGradient: 'from-indigo-600/40 via-transparent to-lime-400/20',
    tone: 'slate',
    objectPosition: '50% 45%',
  }),
} as const satisfies Record<string, HomeMediaItem>;

export type HomeMediaKey = keyof typeof HOME_MEDIA;

export type HomeProofField = {
  id: string;
  media: HomeMediaItem;
  category: string;
  title: string;
  description: string;
  cta: string;
  href: string;
  trackLabel: string;
  cardVariant?: 'image' | 'dark' | 'glass';
};

export const HOME_PROOF_FIELDS: HomeProofField[] = [
  {
    id: 'proof-lab',
    media: HOME_MEDIA.proofLab,
    category: 'LAB · 브랜드',
    title: '스포키듀 LAB',
    description: '프로그램 개발과 강사 교육이 이루어지는 공간',
    cta: '브랜드 보기',
    href: '/about',
    trackLabel: 'cta-home-proof-about',
    cardVariant: 'dark',
  },
  {
    id: 'proof-spomove',
    media: HOME_MEDIA.proofYangcheon,
    category: '기관 정규수업',
    title: '양천거점형키움센터 PAPS 놀이체육',
    description: '체력평가 요소를 놀이형 수업으로 경험하는 PAPS 연계 정규수업',
    cta: '사례 보기',
    href: '/records',
    trackLabel: 'cta-home-proof-records',
    cardVariant: 'image',
  },
  {
    id: 'proof-rhythm',
    media: HOME_MEDIA.proofDongjak,
    category: '기관 정규수업',
    title: '동작거점형키움센터 SPOMOVE',
    description: '스크린 신호에 반응하는 SPOMOVE 에듀테크 놀이체육',
    cta: '사례 보기',
    href: '/records',
    trackLabel: 'cta-home-proof-records',
    cardVariant: 'glass',
  },
  {
    id: 'proof-oneday',
    media: HOME_MEDIA.proofCommunity,
    category: '원데이 행사',
    title: '다사랑영등포지역아동센터 원데이',
    description: '협동 미션과 움직임 놀이로 구성한 원데이 체육행사',
    cta: '사례 보기',
    href: '/records',
    trackLabel: 'cta-home-proof-records',
    cardVariant: 'image',
  },
  {
    id: 'proof-camp',
    media: HOME_MEDIA.proofLounge,
    category: '방학캠프',
    title: 'PLAYZ Lounge 방학캠프',
    description: '체육과 예체능을 결합한 초등 방학캠프',
    cta: '캠프 보기',
    href: '/records',
    trackLabel: 'cta-home-proof-camp',
    cardVariant: 'glass',
  },
  {
    id: 'proof-booth',
    media: HOME_MEDIA.proofEvent,
    category: '공공 행사',
    title: '서대문구 독립문공원 어린이날 체험 부스',
    description: 'SPOMOVE 체험부스 등 시간대별 체육 체험 운영',
    cta: '현장기록 보기',
    href: '/records',
    trackLabel: 'cta-home-proof-records',
    cardVariant: 'dark',
  },
];

export type HomeProgramTrack = 'Private' | 'Dispatch' | 'Curriculum';

export type HomeSignatureProgram = {
  id: string;
  media: HomeMediaItem;
  badge: string;
  name: string;
  description: string;
  tracks: HomeProgramTrack[];
  cta: string;
  href: string;
  trackLabel: string;
  featured?: boolean;
  cardVariant?: 'image' | 'gradient' | 'dark';
};

export const HOME_SIGNATURE_PROGRAMS: HomeSignatureProgram[] = [
  {
    id: 'spomove',
    featured: true,
    media: HOME_MEDIA.programSpomove,
    badge: 'EdTech Play',
    name: 'SPOMOVE',
    description: '보고, 선택하고, 판단하고, 움직이는 스크린 기반 에듀테크 놀이체육',
    tracks: ['Private', 'Dispatch', 'Curriculum'],
    cta: 'SPOMOVE 보기',
    href: '/spomove',
    trackLabel: 'cta-home-program-spomove',
    cardVariant: 'gradient',
  },
  {
    id: 'paps',
    media: HOME_MEDIA.programPaps,
    badge: '체력·놀이',
    name: 'PAPS',
    description: '초등 기초체력 요소를 놀이로 경험하는 프로그램',
    tracks: ['Dispatch', 'Curriculum'],
    cta: '기관 프로그램 보기',
    href: '/dispatch',
    trackLabel: 'cta-home-program-paps',
    cardVariant: 'image',
  },
  {
    id: 'play',
    media: HOME_MEDIA.programPlay,
    badge: '기본 수업',
    name: '놀이체육',
    description: '기본 움직임과 운동 습관을 만드는 스포키듀의 기본 수업',
    tracks: ['Private', 'Dispatch'],
    cta: '수업 문의',
    href: '/contact',
    trackLabel: 'cta-home-program-play',
    cardVariant: 'image',
  },
  {
    id: 'oneday',
    media: HOME_MEDIA.programOneday,
    badge: '기관 행사',
    name: '원데이 체육행사',
    description: '기관 행사와 특별활동에 맞춘 체육 프로그램',
    tracks: ['Dispatch'],
    cta: '기관 프로그램 보기',
    href: '/dispatch',
    trackLabel: 'cta-home-program-event',
    cardVariant: 'dark',
  },
  {
    id: 'camp',
    media: HOME_MEDIA.programCamp,
    badge: '시즌 캠프',
    name: '방학캠프',
    description: '체육과 예체능을 결합한 초등 방학 프로그램',
    tracks: ['Private', 'Dispatch'],
    cta: '기관 프로그램 보기',
    href: '/dispatch',
    trackLabel: 'cta-home-program-camp',
    cardVariant: 'image',
  },
  {
    id: 'curriculum',
    media: HOME_MEDIA.programCurriculum,
    badge: '콘텐츠',
    name: '커리큘럼 콘텐츠',
    description: '수업안, 매뉴얼, 교구 활용법, 강사교육 콘텐츠',
    tracks: ['Curriculum'],
    cta: '커리큘럼 문의',
    href: '/subscription',
    trackLabel: 'cta-home-program-curriculum',
    cardVariant: 'gradient',
  },
];
