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

/** 정적 흰 카드 프레임 클래스. variant 함수는 `landingCardShell` (`./visual/card-variants`)을 쓴다. */
export const landingCardFrame =
  'rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03]';

/** 서브 랜딩 Hero shell — Home `homeHeroShell`과 동일 정렬 */
export const landingHeroShell =
  'relative overflow-hidden rounded-2xl bg-[#FAFAF8] px-5 py-8 ring-1 ring-stone-200/80 sm:px-8 sm:py-10 lg:px-10 lg:py-12';

/** 서브 랜딩 섹션 내부 간격 — Home `homeSectionInner`와 동일 */
export const landingSectionInner = 'space-y-6 sm:space-y-8';

/** Home 전용 — 섹션 간 리듬 (가로 정렬은 SiteShell `main` padding 기준) */
export const homePageStack =
  'flex w-full flex-col gap-14 overflow-x-clip pb-8 sm:gap-[4.5rem] sm:pb-10 lg:gap-24 lg:pb-12';

/** 스크린리더·키보드 — Hero 건너뛰고 본문으로 */
export const homeSkipLink =
  'sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-20 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-lg focus:outline focus:outline-2 focus:outline-[#1D4ED8]';

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

/** 한국어 제목·본문 — keep-all + 균형 줄바꿈 */
export const koreanText = `${koreanLineBreak} text-balance`;

/** 스포키듀 마케팅 사이트 공통 콘텐츠 너비 — padding은 globals.css `.site-container` */
export const siteContainer = 'site-container';

/** 홈 카드 텍스트 패널 — 모바일 20 / 태블릿 22~24 / 데스크톱 24~28 */
export const homeCardPanelPad = 'p-5 md:px-6 md:py-[22px] lg:px-7 lg:py-7';

/** 서브 랜딩 카드 텍스트 패널 — 글자가 칸 앞에 붙지 않도록 */
export const landingCardPanelPad = 'p-5 sm:px-5 sm:py-5 lg:p-6';

/** 이미지 하단 → 제목 최소 간격 */
export const homeCardImageToTitle = 'mt-5';

/** @deprecated landingH1 등 서브용 — `koreanText` 참고 */
export const landingH1 = `text-[1.25rem] font-black leading-[1.14] tracking-tight text-slate-950 min-[360px]:text-[1.35rem] min-[390px]:text-[1.4375rem] min-[430px]:text-[1.5625rem] sm:text-[2.75rem] sm:leading-[1.08] lg:text-[3.25rem] xl:text-[3.5rem] ${koreanText}`;

/** Home Hero H1 */
export const homeHeroH1 = `font-bold tracking-tight text-[#0B1220] ${koreanText} text-[1.625rem] leading-[1.16] min-[360px]:text-[1.75rem] min-[390px]:text-[1.875rem] min-[430px]:text-[2rem] sm:text-[2.5rem] sm:leading-[1.12] lg:text-[3rem] xl:text-[3.25rem]`;

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

/** 홈·공통 섹션 상하 여백 — 모바일 56~72 / 태블릿 72~88 / 데스크톱 96~120 */
export const siteSectionPad =
  'py-14 sm:py-[4.5rem] md:py-[5.5rem] lg:py-24 xl:py-[7.5rem]';

export const siteSectionPadCompact =
  'py-12 sm:py-16 md:py-20 lg:py-[6.5rem]';

/** 브랜드 컬러 */
export const brandNavy = '#0B1220';
export const brandBlue = '#1D4ED8';
export const brandSurface = '#EEF3FA';

/** 홈 H1 — Hero 56~68px */
export const homeHeroTitle = `font-bold leading-[1.15] tracking-tight text-white ${koreanLineBreak} text-[2rem] min-[390px]:text-[2.25rem] sm:text-[2.75rem] md:text-[3.25rem] lg:text-[3.5rem] xl:text-[4.25rem]`;

/** 홈 섹션 H2 — 40~48px */
export const homeSectionH2 = `font-bold tracking-tight text-[#0B1220] ${koreanText} text-[1.75rem] sm:text-[2.125rem] lg:text-[2.5rem] xl:text-[3rem] leading-[1.25]`;

export const homeSectionH2OnDark = `font-bold tracking-tight text-white ${koreanText} text-[1.75rem] sm:text-[2.125rem] lg:text-[2.5rem] xl:text-[3rem] leading-[1.25]`;

/** 섹션 리드 18~20px */
export const homeBodyLead = `mt-5 max-w-[40rem] text-base leading-[1.7] text-slate-600 sm:text-[17px] lg:text-lg xl:text-xl ${koreanText}`;

export const homeBodyLeadOnDark = `mt-5 max-w-[40rem] text-base leading-[1.7] text-white/80 sm:text-[17px] lg:text-lg xl:text-xl ${koreanText}`;

/** 섹션 라벨 */
export const homeSectionEyebrowDark = 'text-[13px] font-semibold uppercase tracking-[0.18em] text-[#1D4ED8] sm:text-sm';

export const homeSectionEyebrowLight = 'text-[13px] font-semibold uppercase tracking-[0.18em] text-white/70 sm:text-sm';

/** 카드 제목 20~24px */
export const homeCardTitle = `text-xl font-bold text-[#0B1220] sm:text-[1.35rem] lg:text-2xl ${koreanText}`;

/** 기본 본문 16~18px */
export const homeBody = `text-base leading-[1.7] text-slate-600 sm:text-[17px] ${koreanText}`;

/** 캡션 13~14px */
export const homeCaption = 'text-[13px] font-medium leading-snug text-slate-500 sm:text-sm';

/** 브랜드 primary CTA — 48~52px */
export const siteBtnPrimary =
  'inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-lg bg-[#1D4ED8] px-7 py-3.5 text-[15px] font-semibold text-white transition hover:bg-[#1a44c4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] sm:min-h-[3.25rem] sm:text-base';

export const siteBtnSecondary =
  'inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-7 py-3.5 text-[15px] font-semibold text-[#0B1220] transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] sm:min-h-[3.25rem] sm:text-base';

export const siteBtnSecondaryOnDark =
  'inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-lg border border-white/35 bg-white/5 px-7 py-3.5 text-[15px] font-semibold text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:min-h-[3.25rem] sm:text-base';

export const siteBtnGhostOnDark =
  'inline-flex min-h-[3rem] items-center justify-center gap-1.5 text-[15px] font-semibold text-white/85 underline-offset-4 transition hover:text-white hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:min-h-[3.25rem] sm:text-base';

/** 얇은 border 카드 — 그림자 최소 */
export const siteCardBorder = 'border border-slate-200/90 bg-white';

/** 홈 에디토리얼 — 현장 기반 브랜드 톤 */
export const homePageSurface = 'bg-[#FAFAF8] text-[#0B1220]';

export const homeSectionPad = 'py-16 sm:py-20 lg:py-24 xl:py-28';

/** Audience·Cases 등 — 기본 대비 15~20% 축소 */
export const homeSectionPadCompact = 'py-12 sm:py-14 lg:py-20 xl:py-[5.5rem]';

/** Final CTA — SPOMOVE 하단·Footer 직전 여백 축소 */
export const homeFinalCtaPad = 'pt-8 pb-12 sm:pt-10 sm:pb-14 lg:pt-12 lg:pb-16';

/** 앵커 스크롤 — sticky header 가림 방지 */
export const homeSectionScrollMt = 'scroll-mt-24 sm:scroll-mt-28';

/** @deprecated 분할 Hero용 — 풀블리드는 `homeHeroFullBleed*` 사용 */
export const homeHeroSection = 'relative bg-[#FAFAF8] pt-24 sm:pt-28 lg:pt-32';

export const homeHeroLead = `mt-5 max-w-[36rem] text-base leading-[1.72] text-slate-600 sm:text-[17px] lg:text-lg ${koreanText}`;

export const homeHeroImage = 'overflow-hidden rounded-xl border border-slate-200/80 bg-slate-200 shadow-sm shadow-slate-900/[0.04]';

/** Home 풀블리드 Hero — edge-to-edge 실사 + 카피 레이어 */
/** 아동·청소년 체육 브랜드 — 전체 화면 점유보다 첫 인상 + 본문 연결을 우선 */
export const homeHeroFullBleed =
  'relative flex min-h-[min(72svh,640px)] w-full flex-col justify-end overflow-hidden bg-[#0B1220] sm:min-h-[min(78svh,720px)]';

export const homeHeroFullBleedScrim =
  'pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0B1220]/90 via-[#0B1220]/45 to-[#0B1220]/25';

export const homeHeroFullBleedCopy =
  'relative z-[1] w-full pb-12 pt-28 sm:pb-16 sm:pt-32 lg:pb-20 lg:pt-36';

export const homeHeroBrand =
  'text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80 sm:text-xs';

export const homeHeroFullBleedTitle = `font-bold tracking-tight text-white ${koreanText} text-[1.875rem] leading-[1.12] min-[390px]:text-[2.125rem] min-[430px]:text-[2.375rem] sm:text-[3rem] sm:leading-[1.08] lg:text-[3.5rem] xl:text-[4rem]`;

export const homeHeroFullBleedLead = `mt-4 max-w-[34rem] text-base leading-[1.65] text-white/85 sm:mt-5 sm:text-[17px] lg:text-lg ${koreanText}`;

export const siteBtnPrimaryOnHero =
  'inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-lg bg-white px-7 py-3.5 text-[15px] font-semibold text-[#0B1220] transition hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:min-h-[3.25rem] sm:text-base';

export const siteBtnSecondaryOnHero =
  'inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-lg border border-white/40 bg-white/10 px-7 py-3.5 text-[15px] font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:min-h-[3.25rem] sm:text-base';

export const homeFocusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]';

export const homeGateCard =
  `group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm shadow-slate-900/[0.03] transition ${fineHover}hover:-translate-y-0.5 ${fineHover}hover:border-slate-300 ${fineHover}hover:shadow-md`;

export const homeCaseCard =
  `group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm shadow-slate-900/[0.03] transition ${fineHover}hover:-translate-y-0.5 ${fineHover}hover:border-slate-300 ${fineHover}hover:shadow-md`;

export const homeDarkSection = 'relative overflow-hidden bg-[#0B1220] text-white';
