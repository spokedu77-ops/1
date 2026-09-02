/**
 * MASTER UI 토큰 클래스 — 전 페이지 통일.
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

/** @deprecated Foundation v3 uses MasterContentCard or MasterCollectionRow. */
export const SPM_COLLECTION_CARD =
  'flex h-full min-h-[220px] flex-col rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 focus-within:ring-2 focus-within:ring-[var(--spm-acc)] focus-within:ring-offset-2';

export const SPM_COLLECTION_CARD_BODY = 'min-h-0 flex-1';

export const SPM_COLLECTION_CARD_FOOTER = 'mt-auto grid gap-2 pt-4';

/** @deprecated Foundation v3 uses MasterState. */
export const SPM_STATE_PANEL =
  'rounded-xl border border-slate-200 bg-white p-4 text-sm font-normal leading-6 text-slate-600';

/** @deprecated Foundation v3 uses MasterState. */
export const SPM_EMPTY_PANEL =
  'rounded-xl border border-slate-200 bg-white px-4 py-5 text-center text-sm text-slate-500';

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
