/**
 * MASTER UI leftover class tokens until canonical remap.
 * Visual SSOT: app/spokedu-master/MASTER_VISUAL_SYSTEM.md
 * Primary 실행 = spm-btn-primary (--spm-cta).
 * 선택 칩/세그먼트 = --spm-acc (실행 파랑과 역할 분리).
 */

/** 필터·탭 칩 공통 */
export const SPM_CHIP =
  'inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--spm-acc)] sm:min-h-8';

export const SPM_CHIP_ACTIVE = 'bg-[var(--spm-acc)] text-white';

export const SPM_CHIP_IDLE =
  'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900';

/** 세그먼트(전체/즐겨찾기 등) — 모서리는 부모가 잡음 */
export const SPM_SEG_ACTIVE = 'bg-[var(--spm-acc)] text-white';

export const SPM_SEG_IDLE =
  'text-[color:var(--spm-t2)] hover:text-[color:var(--spm-t)]';

export function spmChipClass(active: boolean, extra = ''): string {
  return `${SPM_CHIP} ${active ? SPM_CHIP_ACTIVE : SPM_CHIP_IDLE}${extra ? ` ${extra}` : ''}`;
}

export function spmSegClass(active: boolean, extra = ''): string {
  return `min-h-11 rounded-xl px-3 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--spm-acc)] sm:min-h-8 ${
    active ? SPM_SEG_ACTIVE : SPM_SEG_IDLE
  }${extra ? ` ${extra}` : ''}`;
}

/** Foundation v3 compatibility tokens for call sites not yet componentized. */
export const SPM_PAGE_TITLE = 'text-2xl font-semibold leading-tight text-slate-950';
export const SPM_SECTION_HEADING = 'text-lg font-semibold text-slate-900';
export const SPM_CONTENT_TITLE = 'text-base font-semibold text-slate-900';
export const SPM_BODY_TEXT = 'text-sm font-normal text-slate-700';
export const SPM_META_TEXT = 'text-xs font-normal text-slate-500';
export const SPM_STANDARD_SURFACE = 'rounded-xl border border-slate-200 bg-white';
export const SPM_QUIET_ROW = 'border-b border-slate-200 py-3 last:border-b-0';

/** Phase 9A: Core Journey visual roles. Keep these semantic and deliberately small. */
export const SPM_JOURNEY_STACK = 'flex flex-col gap-6 pb-4';
export const SPM_JOURNEY_CONTEXT = 'rounded-xl bg-slate-50 px-4 py-3';
export const SPM_JOURNEY_SURFACE = 'rounded-xl border border-slate-200 bg-white';
export const SPM_JOURNEY_SECTION = 'border-t border-slate-200 pt-5';
export const SPM_JOURNEY_EYEBROW = 'text-xs font-medium text-slate-500';
export const SPM_JOURNEY_HEADING = 'text-lg font-semibold text-slate-900';
export const SPM_JOURNEY_META = 'text-xs font-normal text-slate-500';
export const SPM_JOURNEY_FIELD =
  'w-full rounded-xl border border-transparent bg-slate-50 p-3 text-sm font-normal outline-none transition focus:border-slate-300 focus:bg-white';

/**
 * Canonical Art Direction tokens (Visual SSOT).
 * Home is the first consumer. Do not invent page-local type/width instead of these.
 * Do not remap MasterPageShell here — that would restyle Programs/Library before canonical approval.
 */
export const MV_EDITORIAL_WIDTH = 'mx-auto w-full max-w-[1120px]';
export const MV_HOME_DISPLAY =
  'max-w-xl whitespace-pre-line text-[30px] font-semibold leading-[1.12] text-[color:var(--spm-t)] sm:text-[32px] lg:text-[36px]';
export const MV_SECTION_TITLE =
  'break-keep text-[22px] font-semibold leading-tight text-[color:var(--spm-t)] sm:text-[24px]';
export const MV_SECTION_TITLE_INVERSE =
  'break-keep text-[22px] font-semibold leading-tight text-[color:var(--spm-spomove-surface-fg)] sm:text-[24px]';
export const MV_SECTION_COPY = 'mt-1.5 max-w-xl text-[15px] font-normal leading-6 text-slate-600';
export const MV_SECTION_COPY_INVERSE =
  'mt-2 max-w-xl text-[15px] font-normal leading-6 text-[color:var(--spm-spomove-surface-muted)]';
export const MV_QUIET_ACTION =
  'inline-flex min-h-11 shrink-0 items-center gap-1 text-[14px] font-semibold text-slate-600 transition-colors hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--spm-acc)]';
export const MV_QUIET_ACTION_INVERSE =
  'inline-flex min-h-11 shrink-0 items-center gap-1 text-[14px] font-semibold text-white/80 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white';
export const MV_CONTENT_TITLE = 'text-[18px] font-semibold leading-snug text-[color:var(--spm-t)]';
export const MV_META = 'text-[12px] font-medium leading-5 text-slate-500 sm:text-[13px]';
export const MV_HEADING_TO_SHELF = 'mb-4 sm:mb-5';
export const MV_REENTRY_OBJECT =
  'flex w-full max-w-[660px] flex-wrap items-center gap-x-3.5 gap-y-0 rounded-[14px] border border-slate-200/70 bg-white/65 px-3.5 py-3 sm:flex-nowrap';
export const MV_REENTRY_IDENTITY = 'min-w-0 flex-1';
export const MV_REENTRY_SECONDARY =
  'inline-flex min-h-11 shrink-0 items-center gap-1 text-[14px] font-semibold text-slate-700 transition-colors hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--spm-acc)]';
export const MV_EXTENSION_TITLE =
  'text-[17px] font-semibold leading-snug text-slate-800';
export const MV_HOME_START_QUIET = MV_QUIET_ACTION;
