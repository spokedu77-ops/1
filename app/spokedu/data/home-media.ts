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
  homeHero: fromPhoto(SPOKEDU_IMAGES.home.hero, {
    id: 'home-hero',
    label: '체육수업 현장',
    fallbackGradient: 'from-sky-500 via-blue-700 to-slate-900',
    tone: 'sky',
    /** 지도자·아이 움직임이 카피 영역과 겹치지 않게 */
    objectPosition: '50% 35%',
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
    href: '/spokedu/about',
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
    href: '/spokedu/records',
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
    href: '/spokedu/records',
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
    href: '/spokedu/records',
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
    href: '/spokedu/records',
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
    href: '/spokedu/records',
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
    href: '/spokedu/programs/spomove',
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
    href: '/spokedu/dispatch',
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
    href: '/spokedu/contact',
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
    href: '/spokedu/dispatch',
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
    href: '/spokedu/dispatch',
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
    href: '/spokedu/curriculum',
    trackLabel: 'cta-home-program-curriculum',
    cardVariant: 'gradient',
  },
];
