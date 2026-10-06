/**
 * HOME visual assets — one controlled image language.
 *
 * Roles follow docs/SPOKEDU_PUBLIC_WEBSITE_SSOT.md §09:
 * - BRAND (hero) may be a directed visual.
 * - PROOF (field records, 01 FIELD) must be real field photography.
 * - PRODUCT (MASTER, 02 CONTENT, 03 SYSTEM) must be real product UI.
 *
 * Every entry carries an explicit `objectPosition` so crops are intentional, not accidental.
 */

export type HomeVisual = {
  readonly src: string;
  readonly alt: string;
  /** CSS object-position for the chosen focal point. */
  readonly objectPosition: string;
};

/** BRAND — one dynamic, movement-first scene that leaves room for large type. */
export const HOME_HERO_IMAGE: HomeVisual = {
  src: '/images/spokedu/home/field-editorial/home-hero-gym-motion.jpg',
  alt: '체육관에서 허들을 뛰어넘는 아이와 곁에서 지켜보는 지도자',
  objectPosition: '62% 50%',
};

/** 01 FIELD · 02 CONTENT · 03 SYSTEM — same 4:3 frame, same baseline. */
export const HOME_METHOD_VISUALS: readonly HomeVisual[] = [
  {
    src: '/images/spokedu/records/yangcheon-paps.jpg',
    alt: '지도자가 곁에서 보조하는 가운데 매트 위에서 균형을 잡는 아이',
    objectPosition: '40% 50%',
  },
  {
    src: '/images/spokedu/subscription/prepare-lesson-plan.png',
    alt: '교구 세팅과 사전 체크리스트가 담긴 SPOKEDU MASTER 수업 가이드 화면',
    objectPosition: '50% 0%',
  },
  {
    src: '/images/spokedu/home/field-editorial/home-master-ui.png',
    alt: '이어서 준비할 수업과 추천 프로그램을 보여주는 SPOKEDU MASTER 홈 화면',
    objectPosition: '50% 0%',
  },
];

export type HomeFieldRecord = HomeVisual & {
  readonly title: string;
  readonly place: string;
  readonly href: string;
};

/** PROOF — real field photography only. First entry is the primary case. */
export const HOME_FIELD_RECORDS: readonly HomeFieldRecord[] = [
  {
    title: 'SPOMOVE',
    place: '동작거점 우리동네키움센터',
    // Tighter real crop of the same scene: screen + children, no ceiling/projector.
    src: '/images/spokedu/records/dongjak-spomove-field.jpg',
    alt: '동작거점 우리동네키움센터 SPOMOVE 수업에서 화면을 보며 움직이는 아이들',
    objectPosition: '50% 60%',
    href: '/records/dongjak-spomove',
  },
  {
    title: '특수체육',
    place: '서울 중구 찾아가는 동행 체육교실',
    src: '/images/spokedu/records/donghaeng-special-pe-field.jpg',
    alt: '서울 중구 찾아가는 동행 체육교실에서 지도자가 아이의 움직임을 돕는 장면',
    objectPosition: '50% 50%',
    href: 'https://blog.naver.com/spokedutogether/224338186918',
  },
  {
    title: '스포츠 스텝업',
    place: '매동초등학교 · 종로거점형키움센터',
    src: '/images/spokedu/records/maedong-sports-stepup.jpg',
    alt: '매동초등학교 스포츠 스텝업 수업에서 플로어볼 스틱을 잡은 아이',
    objectPosition: '35% 50%',
    href: 'https://blog.naver.com/spokedutogether/224288711414',
  },
];

/** SPOMOVE — screen stimulus → decision → physical movement in one frame. */
export const HOME_SPOMOVE_VISUAL: HomeVisual = {
  src: '/images/spokedu/dispatch/dispatch-group-class.jpg',
  alt: '화면의 2×2 자극을 보고 매트 위에서 움직이는 SPOMOVE 수업 현장',
  objectPosition: '50% 55%',
};

/** PRODUCT — real MASTER library UI, shown large enough to read. */
export const HOME_MASTER_VISUAL: HomeVisual = {
  src: '/images/spokedu/subscription/library-program-cards.png',
  alt: '대상·공간·기능 조건으로 놀이체육 프로그램을 찾는 SPOKEDU MASTER 수업자료 라이브러리',
  objectPosition: '50% 0%',
};
