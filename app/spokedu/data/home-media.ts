/**
 * Home 전용 미디어 슬롯.
 * 실제 파일: `public/images/spokedu/` — `images.ts`와 동일 경로.
 * src가 null일 때만 CSS gradient visual (깨진 이미지 없음).
 */

import type { SpokeduImageDef } from './images';
import { SPOKEDU_IMAGES } from './images';

export type HomeMediaType = 'image' | 'video' | 'visual';

export type HomeMediaTone = 'indigo' | 'sky' | 'lime' | 'amber' | 'rose' | 'violet' | 'slate';

export type HomeMediaItem = {
  id: string;
  type: HomeMediaType;
  src: string | null;
  poster: string | null;
  alt: string;
  label: string;
  fallbackGradient: string;
  tone: HomeMediaTone;
};

function fromPhoto(
  asset: SpokeduImageDef,
  item: Omit<HomeMediaItem, 'type' | 'src' | 'poster' | 'alt'> & { alt?: string },
): HomeMediaItem {
  return {
    type: 'image',
    src: asset.src,
    poster: null,
    alt: item.alt ?? asset.alt,
    ...item,
  };
}

function media(
  item: Omit<HomeMediaItem, 'type'> & { type?: HomeMediaType },
): HomeMediaItem {
  return { type: item.type ?? 'visual', ...item };
}

export const HOME_MEDIA = {
  homeHero: fromPhoto(SPOKEDU_IMAGES.home.hero, {
    id: 'home-hero',
    label: '체육수업 현장',
    fallbackGradient: 'from-indigo-600 via-indigo-800 to-slate-900',
    tone: 'indigo',
  }),
  trackPrivate: fromPhoto(SPOKEDU_IMAGES.private.oneToOne, {
    id: 'track-private',
    label: '개인·소그룹',
    fallbackGradient: 'from-violet-500 via-indigo-600 to-slate-800',
    tone: 'violet',
  }),
  trackDispatch: fromPhoto(SPOKEDU_IMAGES.dispatch.groupClass, {
    id: 'track-dispatch',
    label: '기관 파견',
    fallbackGradient: 'from-sky-500 via-cyan-700 to-slate-900',
    tone: 'sky',
  }),
  trackCurriculum: fromPhoto(SPOKEDU_IMAGES.curriculum.lessonPlan, {
    id: 'track-curriculum',
    label: '커리큘럼',
    fallbackGradient: 'from-emerald-500 via-teal-700 to-slate-900',
    tone: 'lime',
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
  }),
  proofCenter: fromPhoto(SPOKEDU_IMAGES.dispatch.groupClass, {
    id: 'proof-center',
    label: '리듬챌린지',
    fallbackGradient: 'from-cyan-400 via-teal-600 to-slate-900',
    tone: 'sky',
  }),
  proofCommunity: fromPhoto(SPOKEDU_IMAGES.dispatch.oneDayEvent, {
    id: 'proof-community',
    label: '원데이',
    fallbackGradient: 'from-lime-400 via-emerald-600 to-slate-900',
    tone: 'lime',
  }),
  proofLounge: fromPhoto(SPOKEDU_IMAGES.records.playz, {
    id: 'proof-lounge',
    label: '방학캠프',
    fallbackGradient: 'from-amber-300 via-orange-500 to-slate-900',
    tone: 'amber',
  }),
  proofEvent: fromPhoto(SPOKEDU_IMAGES.dispatch.oneDayEvent, {
    id: 'proof-event',
    label: '체험 부스',
    fallbackGradient: 'from-rose-400 via-pink-600 to-slate-900',
    tone: 'rose',
  }),
  proofMonthly: fromPhoto(SPOKEDU_IMAGES.home.labScene, {
    id: 'proof-monthly',
    label: '월간 기록',
    alt: '월간 스포키듀 운영 기록',
    fallbackGradient: 'from-violet-500 via-indigo-700 to-slate-950',
    tone: 'violet',
  }),
  programSpomove: fromPhoto(SPOKEDU_IMAGES.programs.spomove, {
    id: 'program-spomove',
    label: 'SPOMOVE',
    fallbackGradient: 'from-fuchsia-500 via-violet-700 to-slate-900',
    tone: 'violet',
  }),
  programPaps: fromPhoto(SPOKEDU_IMAGES.programs.paps, {
    id: 'program-paps',
    label: 'PAPS',
    fallbackGradient: 'from-lime-400 via-green-600 to-slate-900',
    tone: 'lime',
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
    fallbackGradient: 'from-indigo-400 to-slate-900',
    tone: 'indigo',
  }),
  finalCta: fromPhoto(SPOKEDU_IMAGES.home.hero, {
    id: 'final-cta',
    label: '상담 연결',
    fallbackGradient: 'from-indigo-600/40 via-transparent to-lime-400/20',
    tone: 'slate',
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
    media: HOME_MEDIA.proofClass,
    category: '기관 정규수업',
    title: '양천거점형키움센터 SPOMOVE',
    description: '보고, 선택하고, 반응하는 에듀테크 체육수업',
    cta: '사례 보기',
    href: '/spokedu/records',
    trackLabel: 'cta-home-proof-records',
    cardVariant: 'image',
  },
  {
    id: 'proof-rhythm',
    media: HOME_MEDIA.proofCenter,
    category: '기관 정규수업',
    title: '동작거점형키움센터 리듬챌린지',
    description: '리듬과 타이밍을 몸으로 경험한 반응형 수업',
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
    href: '/spokedu/programs/camp',
    trackLabel: 'cta-home-proof-camp',
    cardVariant: 'glass',
  },
  {
    id: 'proof-booth',
    media: HOME_MEDIA.proofEvent,
    category: '공공 행사',
    title: '서대문형무소 어린이날 체험 부스',
    description: '아이들이 직접 참여한 체험형 체육 콘텐츠',
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
    description: '보고, 선택하고, 판단하고, 움직이는 빔 기반 에듀테크 놀이체육',
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
    cta: 'PAPS 보기',
    href: '/spokedu/programs/paps',
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
    cta: '원데이 보기',
    href: '/spokedu/programs/oneday-event',
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
    cta: '캠프 보기',
    href: '/spokedu/programs/camp',
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
