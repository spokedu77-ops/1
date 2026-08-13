/** Hover·lift는 fine pointer(마우스)에서만 — 터치 기기 sticky hover 방지 */
export const fineHover = '[@media(hover:hover)_and_(pointer:fine)]:';

export const btnPrimary =
  `inline-flex min-h-[3.25rem] w-full items-center justify-center rounded-[0.875rem] bg-[#245DFF] px-[1.375rem] py-3 text-[15px] font-extrabold leading-snug text-white shadow-[0_12px_28px_rgba(36,93,255,0.25)] transition duration-200 active:scale-[0.98] sm:w-auto ${fineHover}hover:bg-[#174BE6] ${fineHover}hover:-translate-y-0.5 ${fineHover}hover:shadow-[0_16px_34px_rgba(36,93,255,0.32)]`;

export const btnPrimaryOnDark =
  `inline-flex min-h-[3.25rem] w-full items-center justify-center rounded-[0.875rem] bg-white px-[1.375rem] py-3 text-[15px] font-extrabold leading-snug text-[#0B1F46] shadow-[0_12px_28px_rgba(3,12,30,0.2)] transition duration-200 active:scale-[0.98] sm:w-auto ${fineHover}hover:bg-[#EAF1FF] ${fineHover}hover:-translate-y-0.5`;

export const btnSecondary =
  `inline-flex min-h-[3.25rem] w-full items-center justify-center rounded-[0.875rem] border border-[#D5DEEB] bg-white px-[1.375rem] py-3 text-[15px] font-extrabold text-[#0B1F46] shadow-[0_8px_22px_rgba(15,33,70,0.07)] transition duration-200 active:scale-[0.98] sm:w-auto ${fineHover}hover:border-[#AFC0D7] ${fineHover}hover:-translate-y-0.5 ${fineHover}hover:shadow-[0_12px_28px_rgba(15,33,70,0.11)]`;

export const btnSecondaryOnDark =
  `inline-flex min-h-[3.25rem] w-full items-center justify-center rounded-[0.875rem] border border-white/30 bg-white/8 px-[1.375rem] py-3 text-[15px] font-extrabold leading-snug text-white shadow-[0_8px_24px_rgba(3,12,30,0.14)] transition duration-200 active:scale-[0.98] sm:w-auto ${fineHover}hover:-translate-y-0.5 ${fineHover}hover:border-white/50 ${fineHover}hover:bg-white/12`;

export const cardInteractive =
  `transition duration-200 ${fineHover}hover:-translate-y-1 ${fineHover}hover:border-[#C5D2E8] ${fineHover}hover:shadow-[0_14px_32px_rgba(15,33,70,0.08)]`;

export const linkMuted =
  'font-semibold text-[#0B1F46] underline-offset-2 hover:underline active:text-[#245DFF]';

/** 섹션 제목 아래 한 줄 안내 */
export const landingSectionLead =
  'mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-[15px]';

/** Hero 서브·3축 문구 위계 */
export const landingHeroSubtitle =
  'text-[15px] leading-relaxed text-slate-600 sm:text-base sm:leading-7';

export const landingHeroSupport =
  'rounded-xl border border-slate-200/70 bg-slate-50/80 px-4 py-3 text-sm leading-relaxed text-slate-600 sm:leading-6';

export const landingPageStack =
  'flex w-full flex-col gap-14 overflow-x-clip pb-8 sm:gap-[4.5rem] sm:pb-10 lg:gap-24 lg:pb-12';

/** 개인·기관 랜딩 — 밀도 높은 섹션 리듬 */
export const audienceLandingStack =
  'flex w-full flex-col gap-10 overflow-x-clip pb-8 sm:gap-12 sm:pb-10 lg:gap-16 lg:pb-12';

/** 정적 흰 카드 프레임 클래스. variant 함수는 `landingCardShell` (`./visual/card-variants`)을 쓴다. */
export const landingCardFrame =
  'rounded-[1.25rem] border border-[#DCE3EE] bg-white shadow-[0_12px_32px_rgba(15,33,70,0.04)]';

/** 서브 랜딩 Hero shell — Home `homeHeroShell`과 동일 정렬 */
export const landingHeroShell =
  'relative overflow-hidden rounded-[1.5rem] bg-white px-5 py-8 shadow-[0_18px_50px_rgba(15,33,70,0.06)] ring-1 ring-[#DCE3EE] sm:rounded-[1.75rem] sm:px-8 sm:py-10 lg:px-10 lg:py-12';

/** 브랜드 액센트 — 전 페이지 공통 */
export const brandKicker = 'text-[11px] font-bold uppercase tracking-[0.14em] text-[#245DFF]';
export const brandFocusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245DFF]';
export const brandLink = `font-semibold text-[#245DFF] ${fineHover}hover:text-[#174BE6]`;

/** 서브 랜딩 섹션 내부 간격 — Home `homeSectionInner`와 동일 */
export const landingSectionInner = 'space-y-6 sm:space-y-8';

/** Home 전용 — 섹션 간 리듬 (가로 정렬은 SiteShell `main` padding 기준) */
export const homePageStack =
  'flex w-full flex-col gap-14 overflow-x-clip pb-8 sm:gap-[4.5rem] sm:pb-10 lg:gap-24 lg:pb-12';

/** 스크린리더·키보드 — Hero 건너뛰고 본문으로 */
export const homeSkipLink =
  'sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-20 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-lg focus:outline focus:outline-2 focus:outline-[#245DFF]';

/** Hero + 운영 증거 — 한 덩어리로 붙여 위계 정리 */
export const homeIntroCluster = 'flex w-full flex-col gap-10 sm:gap-12';

/** 섹션 내부 제목↔콘텐츠 간격 */
export const homeSectionInner = 'space-y-6 sm:space-y-8';

/** 현장·프로그램 등 비주얼 무게 큰 블록 */
export const homeSectionInnerLg = 'space-y-7 sm:space-y-9 lg:space-y-10';

/** Home 섹션 배경 밴드 — main 콘텐츠 폭과 동일 */
export const homeBleedBand =
  'w-full border-y border-slate-200/90 bg-slate-50/70 py-8 sm:py-10';

/** 홈 실사 — 과보정 없이 선명·생생하게 */
export const homePhotoGrade =
  'object-cover brightness-[1.03] contrast-[1.06] saturate-[1.06]';

export const landingSectionTitle = 'text-xl font-bold tracking-[-0.03em] text-[#14213A] sm:text-2xl';

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
export const landingH1 = `text-[1.25rem] font-black leading-[1.14] tracking-tight text-[#14213A] min-[360px]:text-[1.35rem] min-[390px]:text-[1.4375rem] min-[430px]:text-[1.5625rem] sm:text-[2.75rem] sm:leading-[1.08] lg:text-[3.25rem] xl:text-[3.5rem] ${koreanText}`;

/** Home Hero H1 */
export const homeHeroH1 = `font-bold tracking-[-0.035em] text-[#14213A] ${koreanText} text-[1.625rem] leading-[1.16] min-[360px]:text-[1.75rem] min-[390px]:text-[1.875rem] min-[430px]:text-[2rem] sm:text-[2.5rem] sm:leading-[1.12] lg:text-[3rem] xl:text-[3.25rem]`;

/** 의미 줄 1개 = 블록 1줄 (내부에서 다시 쪼개지지 않게 폭·크기는 homeHeroH1이 담당) */
export const homeHeroH1Line = 'block';

/** Home 섹션 대제목 (프로그램 블록과 동일 위계) */
export const homeSectionTitle = `text-[1.75rem] font-black leading-[1.12] tracking-[-0.04em] text-[#14213A] sm:text-4xl lg:text-[2.65rem] ${koreanLineBreak}`;

export const homeSectionEyebrow =
  'text-[11px] font-bold uppercase tracking-[0.14em] text-[#245DFF]';

export const homeHeroShell =
  'relative overflow-hidden rounded-[1.75rem] bg-gradient-to-b from-white via-white to-slate-50/80 px-5 py-8 shadow-sm shadow-slate-900/[0.06] ring-1 ring-slate-200/70 sm:rounded-[2rem] sm:px-8 sm:py-10 lg:px-10 lg:py-12';

/** 다크 CTA 그리드 — 모바일 2줄·높이 균일 */
export const landingDarkCtaButton = `${btnPrimaryOnDark} text-center`;

/** 홈·공통 섹션 상하 여백 — 모바일 56~72 / 태블릿 72~88 / 데스크톱 96~120 */
export const siteSectionPad =
  'py-14 sm:py-[4.5rem] md:py-[5.5rem] lg:py-24 xl:py-[7.5rem]';

export const siteSectionPadCompact =
  'py-12 sm:py-16 md:py-20 lg:py-[6.5rem]';

/** 브랜드 컬러 — SPOMOVE 카탈로그 하이브리드 (세련된 navy/blue/paper) */
export const brandNavy = '#0B1F46';
export const brandBlue = '#245DFF';
export const brandBlueHover = '#174BE6';
export const brandSurface = '#EAF1FF';
export const brandPaper = '#F5F7FB';
export const brandInk = '#14213A';
export const brandBody = '#536279';
export const brandMuted = '#728097';
export const brandBorder = '#DCE3EE';
export const brandWhite = '#FFFFFF';
export const brandDarkBody = '#CFDAEA';
export const brandDarkEyebrow = '#9FC0FF';
export const brandPadRed = '#ED3D4F';
export const brandPadYellow = '#F5BF1F';
export const brandPadGreen = '#67A92C';
export const brandPadBlue = '#1F64BF';

/** 홈 H1 — Hero 56~68px */
export const homeHeroTitle = `font-bold leading-[1.15] tracking-tight text-white ${koreanLineBreak} text-[2rem] min-[390px]:text-[2.25rem] sm:text-[2.75rem] md:text-[3.25rem] lg:text-[3.5rem] xl:text-[4.25rem]`;

/** 홈 섹션 H2 — 카탈로그식 디스플레이 (홈용으로 한 단계 완화) */
export const homeSectionH2 = `font-black tracking-[-0.04em] text-[#14213A] ${koreanText} text-[1.85rem] sm:text-[2.25rem] lg:text-[2.65rem] xl:text-[3rem] leading-[1.12]`;

export const homeSectionH2OnDark = `font-black tracking-[-0.04em] text-white ${koreanText} text-[1.85rem] sm:text-[2.25rem] lg:text-[2.65rem] xl:text-[3rem] leading-[1.12]`;

/** 섹션 리드 18~20px */
export const homeBodyLead = `mt-5 max-w-[40rem] text-base leading-[1.7] text-[#536279] sm:text-[17px] lg:text-lg xl:text-xl ${koreanText}`;

export const homeBodyLeadOnDark = `mt-5 max-w-[40rem] text-base leading-[1.7] text-[#CFDAEA] sm:text-[17px] lg:text-lg xl:text-xl ${koreanText}`;

/** 섹션 라벨 */
export const homeSectionEyebrowDark = 'text-[12px] font-bold uppercase tracking-[0.14em] text-[#245DFF] sm:text-[13px]';

export const homeSectionEyebrowLight = 'text-[12px] font-bold uppercase tracking-[0.14em] text-[#9FC0FF] sm:text-[13px]';

/** 카드 제목 20~24px */
export const homeCardTitle = `text-xl font-bold text-[#14213A] sm:text-[1.35rem] lg:text-2xl ${koreanText}`;

/** 기본 본문 16~18px */
export const homeBody = `text-base leading-[1.7] text-[#536279] sm:text-[17px] ${koreanText}`;

/** 캡션 13~14px */
export const homeCaption = 'text-[13px] font-medium leading-snug text-[#728097] sm:text-sm';

/** 브랜드 primary CTA — 48~52px */
export const siteBtnPrimary =
  `inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-full bg-[#245DFF] px-7 py-3.5 text-[15px] font-semibold text-white shadow-[0_14px_30px_rgba(36,93,255,0.22)] transition ${fineHover}hover:bg-[#174BE6] ${fineHover}hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245DFF] sm:min-h-[3.25rem] sm:text-base`;

export const siteBtnSecondary =
  `inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-full border border-[#DCE3EE] bg-white px-7 py-3.5 text-[15px] font-semibold text-[#0B1F46] transition ${fineHover}hover:border-[#B8C6DC] ${fineHover}hover:bg-[#F5F7FB] ${fineHover}hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245DFF] sm:min-h-[3.25rem] sm:text-base`;

export const siteBtnSecondaryOnDark =
  `inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-full border border-white/25 bg-white/5 px-7 py-3.5 text-[15px] font-semibold text-white transition ${fineHover}hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:min-h-[3.25rem] sm:text-base`;

export const siteBtnGhostOnDark =
  'inline-flex min-h-[3rem] items-center justify-center gap-1.5 text-[15px] font-semibold text-white/85 underline-offset-4 transition hover:text-white hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:min-h-[3.25rem] sm:text-base';

/** 얇은 border 카드 — 그림자 최소 */
export const siteCardBorder = 'border border-[#DCE3EE] bg-white';

/** 홈 — paper 서피스 + 카탈로그 ink */
export const homePageSurface = 'bg-[#F5F7FB] text-[#14213A]';

export const homeSectionPad = 'py-16 sm:py-20 lg:py-24 xl:py-28';

/** Audience·Cases 등 — 기본 대비 15~20% 축소 */
export const homeSectionPadCompact = 'py-9 sm:py-12 lg:py-14 xl:py-16';

/** Final CTA — SPOMOVE 하단·Footer 직전 여백 축소 */
export const homeFinalCtaPad = 'pt-8 pb-12 sm:pt-10 sm:pb-14 lg:pt-12 lg:pb-16';

/** 앵커 스크롤 — sticky header 가림 방지 */
export const homeSectionScrollMt = 'scroll-mt-24 sm:scroll-mt-28';

/** soft-blue 밴드 — 카탈로그 field-section 리듬 */
export const homeBandSoftBlue =
  'bg-[linear-gradient(180deg,#EEF4FF_0%,#F7F9FD_100%)] border-y border-[#DBE6FB]';

export const homeBandWhite = 'bg-white border-y border-[#EDF0F5]';

export const homeBandNavy = 'bg-[#0B1F46] text-white';

/** @deprecated 분할 Hero용 — 풀블리드는 `homeHeroFullBleed*` 사용 */
export const homeHeroSection = 'relative bg-[#F5F7FB] pt-24 sm:pt-28 lg:pt-32';

export const homeHeroLead = `mt-5 max-w-[36rem] text-base leading-[1.72] text-slate-600 sm:text-[17px] lg:text-lg ${koreanText}`;

export const homeHeroImage = 'overflow-hidden rounded-xl border border-slate-200/80 bg-slate-200 shadow-sm shadow-slate-900/[0.04]';

/** Home 풀블리드 Hero — 현장 사진 + 브랜드 navy 스크림 */
export const homeHeroFullBleed =
  'relative flex min-h-[min(78svh,720px)] w-full flex-col justify-center overflow-hidden bg-[#0B1F46] sm:min-h-[min(84svh,780px)]';

export const homeHeroFullBleedScrim =
  'pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(11,31,70,0.66)_0%,rgba(11,31,70,0.46)_36%,rgba(11,31,70,0.26)_58%,rgba(11,31,70,0.58)_100%)] sm:bg-[linear-gradient(105deg,rgba(11,31,70,0.76)_0%,rgba(11,31,70,0.44)_40%,rgba(11,31,70,0.16)_68%,rgba(11,31,70,0.34)_100%)]';

export const homeHeroFullBleedCopy =
  'relative z-[1] w-full py-28 sm:py-32 lg:py-36';

export const homeHeroBrand =
  'text-[11px] font-bold uppercase tracking-[0.22em] text-[#9FC0FF] sm:text-xs';

export const homeHeroFullBleedTitle = `font-black tracking-[-0.045em] text-white ${koreanText} text-[1.85rem] leading-[1.12] min-[390px]:text-[2.15rem] sm:text-[2.75rem] sm:leading-[1.08] lg:text-[3.25rem] xl:text-[3.5rem]`;

export const homeHeroFullBleedLead = `text-[15px] leading-[1.65] text-[#D5DFED] sm:text-base ${koreanText}`;

export const siteBtnPrimaryOnHero =
  `inline-flex items-center justify-center gap-2 rounded-full bg-white text-[14px] font-semibold text-[#0B1F46] shadow-[0_10px_24px_rgba(11,31,70,0.18)] transition ${fineHover}hover:bg-[#EAF1FF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:text-[15px]`;

export const siteBtnSecondaryOnHero =
  `inline-flex items-center justify-center gap-2 rounded-full border border-white/45 bg-white/5 text-[14px] font-semibold text-white backdrop-blur-[2px] transition ${fineHover}hover:bg-white/12 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:text-[15px]`;

export const homeFocusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245DFF]';

export const focusRing = homeFocusRing;

export const homeGateCard =
  `group flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-[#DCE3EE] bg-white shadow-[0_12px_32px_rgba(15,33,70,0.05)] transition ${fineHover}hover:-translate-y-0.5 ${fineHover}hover:border-[#C5D2E8] ${fineHover}hover:shadow-[0_18px_40px_rgba(15,33,70,0.08)]`;

/** 홈 Audience Gate — 빠른 경로 선택용 compact block (이미지 카드와 구분) */
export const homePathNavItem =
  `group flex h-full min-w-0 flex-col rounded-[1.1rem] border border-[#D6E3FF]/90 bg-white/90 px-4 py-4 transition ${fineHover}hover:border-[#245DFF]/35 ${fineHover}hover:bg-white ${fineHover}hover:shadow-[0_10px_28px_rgba(15,33,70,0.06)] sm:px-4 sm:py-4`;

export const homeCaseCard =
  `group flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-[#DCE3EE] bg-white shadow-[0_12px_32px_rgba(15,33,70,0.05)] transition ${fineHover}hover:border-[#C5D2E8]`;

export const homeDarkSection = 'relative overflow-hidden bg-[#0B1F46] text-white';

/** 서브 랜딩 — 홈과 동일 풀블리드 cinematic Hero */
export const landingHeroCinematic =
  'relative flex min-h-[min(72svh,680px)] w-full flex-col justify-center overflow-hidden bg-[#0B1F46] sm:min-h-[min(78svh,740px)]';

export const landingHeroCinematicScrim = homeHeroFullBleedScrim;

export const landingHeroCinematicCopy = homeHeroFullBleedCopy;

/**
 * Public Marketing foundation
 * - 다음 페이지별 리팩토링에서 점진적으로 사용한다.
 * - 기존 home, landing, site prefix export는 현재 화면 호환을 위해 유지한다.
 */
export const marketingHeroDisplay =
  `[font-family:var(--spokedu-marketing-font-display)] font-bold tracking-[-0.04em] [font-synthesis:weight] ${koreanText} text-[2.75rem] leading-[1.08] min-[390px]:text-[3rem] sm:text-[3.75rem] md:text-[4.25rem] lg:text-[4.5rem] xl:text-[4.75rem]`;

export const marketingSectionDisplay =
  `[font-family:var(--spokedu-marketing-font-display)] font-bold tracking-[-0.03em] [font-synthesis:weight] ${koreanText} text-[2.125rem] leading-[1.16] sm:text-[2.625rem] md:text-[3rem] lg:text-[3.5rem]`;

export const marketingCompactDisplay =
  `[font-family:var(--spokedu-marketing-font-display)] font-bold tracking-[-0.03em] [font-synthesis:weight] ${koreanText} text-[1.75rem] leading-[1.16] sm:text-[2.1rem] lg:text-[2.75rem]`;

export const marketingMetricDisplay =
  '[font-family:var(--spokedu-marketing-font-display)] text-[2.5rem] font-normal leading-none tracking-[-0.035em] sm:text-[3.25rem] lg:text-[4rem]';

export const marketingEyebrow =
  'text-[12px] font-bold [color:var(--spokedu-marketing-color-blue)] sm:text-[13px]';
export const marketingEyebrowOnDark =
  'text-[12px] font-bold [color:var(--spokedu-marketing-color-dark-eyebrow)] sm:text-[13px]';
export const marketingEyebrowUppercase = 'uppercase tracking-[0.14em]';
export const marketingSectionLead =
  `max-w-[40rem] text-base leading-[1.7] [color:var(--spokedu-marketing-color-body)] sm:text-[17px] lg:text-lg ${koreanText}`;
export const marketingBody =
  `text-base leading-[1.7] [color:var(--spokedu-marketing-color-body)] sm:text-[17px] ${koreanText}`;
export const marketingCaption =
  'text-[13px] font-medium leading-[1.5] [color:var(--spokedu-marketing-color-muted)] sm:text-sm';

export const marketingSectionPad = siteSectionPad;
export const marketingSectionPadCompact = siteSectionPadCompact;
export const marketingSectionInner = siteContainer;
export const marketingCardPadding = landingCardPanelPad;
export const marketingMajorGridGap = 'gap-8 lg:gap-12';

export const marketingBandWhite = 'bg-[var(--spokedu-marketing-color-white)]';
export const marketingBandSoft = 'bg-[var(--spokedu-marketing-color-paper)]';
export const marketingBandNavy = 'bg-[radial-gradient(circle_at_82%_18%,rgba(75,127,255,0.2),transparent_32%),radial-gradient(circle_at_12%_86%,rgba(36,93,255,0.13),transparent_34%),linear-gradient(135deg,#081126_0%,var(--spokedu-marketing-color-navy)_58%,#132245_100%)] text-white';
export const marketingLightHeroSurface = 'bg-[radial-gradient(circle_at_8%_18%,rgba(75,127,255,0.14),transparent_30%),radial-gradient(circle_at_88%_22%,rgba(12,166,120,0.1),transparent_25%),radial-gradient(circle_at_68%_100%,rgba(36,93,255,0.1),transparent_32%),linear-gradient(180deg,#FFFFFF_0%,#F5F8FF_100%)]';
export const marketingBandTransparent = 'bg-transparent';

export const marketingRadiusSmall = '[border-radius:var(--spokedu-marketing-radius-sm)]';
export const marketingRadiusMedium = '[border-radius:var(--spokedu-marketing-radius-md)]';
export const marketingRadiusLarge = '[border-radius:var(--spokedu-marketing-radius-lg)]';
export const marketingRadiusPill = '[border-radius:var(--spokedu-marketing-radius-pill)]';

export const marketingCardStatic =
  `${marketingRadiusMedium} border border-[var(--spokedu-marketing-color-border)] bg-[var(--spokedu-marketing-color-white)] shadow-[var(--spokedu-marketing-shadow-subtle)]`;
export const marketingCardInteractive =
  `${marketingCardStatic} transition duration-200 ${fineHover}hover:-translate-y-0.5 ${fineHover}hover:shadow-[var(--spokedu-marketing-shadow-interactive)]`;
export const marketingMediaFrame =
  `${marketingRadiusMedium} overflow-hidden border border-[var(--spokedu-marketing-color-border)] bg-[var(--spokedu-marketing-color-white)] shadow-[var(--spokedu-marketing-shadow-media)]`;
export const marketingPanelEmphasized =
  `${marketingRadiusLarge} overflow-hidden bg-[var(--spokedu-marketing-color-soft)]`;

export const marketingButtonPrimary = `${btnPrimary} ${brandFocusRing}`;
export const marketingButtonSecondary = `${btnSecondary} ${brandFocusRing}`;
export const marketingButtonPrimaryOnDark =
  `${btnPrimaryOnDark} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white`;
export const marketingButtonSecondaryOnDark =
  `${btnSecondaryOnDark} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white`;
export const marketingButtonTextAction =
  `inline-flex min-h-11 items-center font-semibold [color:var(--spokedu-marketing-color-blue)] underline-offset-4 transition ${fineHover}hover:underline ${brandFocusRing}`;
