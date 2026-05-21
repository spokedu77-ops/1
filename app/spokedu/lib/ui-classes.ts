/** Hover·lift는 fine pointer(마우스)에서만 — 터치 기기 sticky hover 방지 */
export const fineHover = '[@media(hover:hover)_and_(pointer:fine)]:';

export const btnPrimary =
  `inline-flex min-h-11 w-full items-center justify-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition active:scale-[0.98] sm:w-auto ${fineHover}hover:bg-slate-800 ${fineHover}hover:-translate-y-0.5`;

export const btnPrimaryOnDark =
  `inline-flex min-h-11 w-full items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition active:scale-[0.98] sm:w-auto ${fineHover}hover:bg-slate-200 ${fineHover}hover:-translate-y-0.5`;

export const btnSecondary =
  `inline-flex min-h-11 w-full items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition active:scale-[0.98] sm:w-auto ${fineHover}hover:border-slate-500 ${fineHover}hover:-translate-y-0.5`;

export const btnSecondaryOnDark =
  `inline-flex min-h-11 w-full items-center justify-center rounded-full border border-slate-600 px-5 py-2.5 text-sm font-semibold text-white transition active:scale-[0.98] sm:w-auto ${fineHover}hover:border-slate-400 ${fineHover}hover:bg-slate-900 ${fineHover}hover:-translate-y-0.5`;

export const cardInteractive =
  `transition duration-200 ${fineHover}hover:-translate-y-1 ${fineHover}hover:border-slate-300 ${fineHover}hover:shadow-lg`;

export const linkMuted =
  'font-semibold text-slate-800 underline-offset-2 hover:underline active:text-indigo-700';

/** Home · About · 랜딩 계열 공통 세로 리듬 */
export const landingTrackStack =
  'mx-auto flex w-full max-w-6xl flex-col gap-16 pb-4 sm:gap-24 sm:pb-6 lg:gap-28';

export const landingPageStack = landingTrackStack;

export const landingSectionTitle = 'text-xl font-bold tracking-tight text-slate-950 sm:text-2xl';

export const landingHeroGrid =
  'flex flex-col gap-6 sm:gap-8 lg:grid lg:grid-cols-[1fr_1.15fr] lg:items-center lg:gap-12';

/** 모바일: 카피·CTA 먼저, 이미지 다음 */
export const landingHeroCopy = 'order-1 space-y-5 sm:space-y-6 lg:space-y-8';

export const landingHeroVisual = 'order-2 lg:order-2';

export const landingHeroShell =
  'relative overflow-hidden rounded-[1.75rem] border px-4 pb-5 pt-6 shadow-sm sm:rounded-[2rem] sm:px-10 sm:pb-10 sm:pt-12';

export const landingH1 = 'text-[2.25rem] font-black leading-[1.02] tracking-tight sm:text-6xl';
