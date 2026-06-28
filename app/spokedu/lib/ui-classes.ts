/** Hover·lift는 fine pointer(마우스)에서만 — 터치 기기 sticky hover 방지 */
export const fineHover = '[@media(hover:hover)_and_(pointer:fine)]:';

export const btnPrimary =
  `inline-flex min-h-12 w-full items-center justify-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold leading-snug text-white transition active:scale-[0.98] sm:w-auto ${fineHover}hover:bg-slate-800 ${fineHover}hover:-translate-y-0.5`;

export const btnPrimaryOnDark =
  `inline-flex min-h-12 w-full items-center justify-center rounded-full bg-white px-4 py-2.5 text-sm font-semibold leading-snug text-slate-950 transition active:scale-[0.98] sm:px-5 sm:w-auto ${fineHover}hover:bg-slate-200 ${fineHover}hover:-translate-y-0.5`;

export const btnSecondary =
  `inline-flex min-h-11 w-full items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition active:scale-[0.98] sm:w-auto ${fineHover}hover:border-slate-500 ${fineHover}hover:-translate-y-0.5`;

export const btnSecondaryOnDark =
  `inline-flex min-h-12 w-full items-center justify-center rounded-full border border-slate-600 px-5 py-2.5 text-sm font-semibold leading-snug text-white transition active:scale-[0.98] sm:w-auto ${fineHover}hover:border-slate-400 ${fineHover}hover:bg-slate-900 ${fineHover}hover:-translate-y-0.5`;

export const cardInteractive =
  `transition duration-200 ${fineHover}hover:-translate-y-1 ${fineHover}hover:border-slate-300 ${fineHover}hover:shadow-lg`;

export const linkMuted =
  'font-semibold text-slate-800 underline-offset-2 hover:underline active:text-indigo-700';

/** @deprecated Home·서브 공통 — `landingPageStack` 사용 (max-w 중복 제거) */
export const landingTrackStack =
  'flex w-full flex-col gap-14 overflow-x-clip pb-8 sm:gap-[4.5rem] sm:pb-10 lg:gap-24 lg:pb-12';

/** 섹션 제목 아래 한 줄 안내 */
export const landingSectionLead =
  'mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-[15px]';

/** Hero 서브·3축 문구 위계 */
export const landingHeroSubtitle =
  'text-[15px] leading-relaxed text-slate-600 sm:text-base sm:leading-7';

export const landingHeroSupport =
  'rounded-xl border border-slate-200/70 bg-slate-50/80 px-4 py-3 text-sm leading-relaxed text-slate-600 sm:leading-6';

export const landingPageStack = landingTrackStack;

/** 개인·기관 랜딩 — 밀도 높은 섹션 리듬 */
export const audienceLandingStack =
  'flex w-full flex-col gap-10 overflow-x-clip pb-8 sm:gap-12 sm:pb-10 lg:gap-16 lg:pb-12';

export const landingCardShell =
  'rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03]';

/** 서브 랜딩 Hero shell — Home `homeHeroShell`과 동일 정렬 */
export const landingHeroShell =
  'relative overflow-hidden rounded-2xl bg-[#FAFAF8] px-5 py-8 ring-1 ring-stone-200/80 sm:px-8 sm:py-10 lg:px-10 lg:py-12';

/** 서브 랜딩 섹션 내부 간격 — Home `homeSectionInner`와 동일 */
export const landingSectionInner = 'space-y-6 sm:space-y-8';

/** Home 전용 — 섹션 간 리듬 (가로 정렬은 SiteShell `main` padding 기준) */
export const homePageStack =
  'flex w-full flex-col gap-14 overflow-x-clip pb-8 sm:gap-[4.5rem] sm:pb-10 lg:gap-24 lg:pb-12';

/** 스크린리더·키보드 — Hero 건너뛰고 맞춤 선택으로 */
export const homeSkipLink =
  'sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-indigo-700 focus:shadow-lg focus:outline focus:outline-2 focus:outline-indigo-500';

/** Hero + 운영 증거 — 한 덩어리로 붙여 위계 정리 */
export const homeIntroCluster = 'flex w-full flex-col gap-10 sm:gap-12';

/** 섹션 내부 제목↔콘텐츠 간격 */
export const homeSectionInner = 'space-y-6 sm:space-y-8';

/** 현장·프로그램 등 비주얼 무게 큰 블록 */
export const homeSectionInnerLg = 'space-y-7 sm:space-y-9 lg:space-y-10';

/** Home 섹션 배경 밴드 — main 콘텐츠 폭과 동일 */
export const homeBleedBand =
  'w-full border-y border-slate-200/90 bg-slate-50/70 py-8 sm:py-10';

/** Home 실사 통일 톤 (보정 JPG 전 단계 — 슬라이트 과하지 않게) */
export const homePhotoGrade =
  'object-cover brightness-[1.02] contrast-[1.04] saturate-[1.06]';

export const landingSectionTitle = 'text-xl font-bold tracking-tight text-slate-950 sm:text-2xl';

export const landingHeroGrid =
  'flex flex-col gap-6 sm:gap-8 lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] lg:items-center lg:gap-10 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)] xl:gap-12';

/** 모바일: 카피·CTA 먼저, 이미지 다음 */
export const landingHeroCopy = 'order-1 space-y-5 sm:space-y-6 lg:space-y-8';

export const landingHeroVisual = 'order-2 lg:order-2';

/** 한국어 제목·본문 — 단어 중간 줄바꿈 방지 (기|관 등) */
export const koreanLineBreak = 'break-keep [word-break:keep-all] [line-break:strict]';

export const landingH1 = `text-[1.25rem] font-black leading-[1.14] tracking-tight text-slate-950 min-[360px]:text-[1.35rem] min-[390px]:text-[1.4375rem] min-[430px]:text-[1.5625rem] sm:text-[2.75rem] sm:leading-[1.08] lg:text-[3.25rem] xl:text-[3.5rem] ${koreanLineBreak}`;

/** Home Hero H1 — 모바일에서도 의미 2줄 유지 (단어 단위 세로 쪼개짐 방지) */
export const homeHeroH1 = `font-black tracking-tight text-slate-950 ${koreanLineBreak} text-[1.25rem] leading-[1.14] min-[360px]:text-[1.35rem] min-[390px]:text-[1.4375rem] min-[430px]:text-[1.5625rem] sm:text-[2.75rem] sm:leading-[1.08] lg:text-[3.25rem] xl:text-[3.5rem]`;

/** 의미 줄 1개 = 블록 1줄 (내부에서 다시 쪼개지지 않게 폭·크기는 homeHeroH1이 담당) */
export const homeHeroH1Line = 'block';

/** Home 섹션 대제목 (프로그램 블록과 동일 위계) */
export const homeSectionTitle = `text-[1.75rem] font-black leading-[1.12] tracking-tight text-slate-950 sm:text-4xl lg:text-[2.65rem] ${koreanLineBreak}`;

export const homeSectionEyebrow =
  'text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-600';

export const homeHeroShell =
  'relative overflow-hidden rounded-[1.75rem] bg-gradient-to-b from-white via-white to-slate-50/80 px-5 py-8 shadow-sm shadow-slate-900/[0.06] ring-1 ring-slate-200/70 sm:rounded-[2rem] sm:px-8 sm:py-10 lg:px-10 lg:py-12';

/** 다크 CTA 그리드 — 모바일 2줄·높이 균일 */
export const landingDarkCtaButton = `${btnPrimaryOnDark} text-center`;
