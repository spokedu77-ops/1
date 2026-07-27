/**
 * MASTER UI 토큰 클래스 — 전 페이지 통일.
 * Primary 실행 = spm-btn-primary (--spm-cta).
 * 선택 칩/세그먼트 = --spm-acc (실행 파랑과 역할 분리).
 */

/** 필터·탭 칩 공통 */
export const SPM_CHIP =
  'inline-flex h-8 shrink-0 items-center rounded-full px-3 text-[11px] font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--spm-acc)]';

export const SPM_CHIP_ACTIVE = 'bg-[var(--spm-acc)] text-white shadow-sm';

export const SPM_CHIP_IDLE =
  'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900';

/** 세그먼트(전체/즐겨찾기 등) — 모서리는 부모가 잡음 */
export const SPM_SEG_ACTIVE = 'bg-[var(--spm-acc)] text-white shadow-sm';

export const SPM_SEG_IDLE =
  'text-[color:var(--spm-t2)] hover:text-[color:var(--spm-t)]';

export function spmChipClass(active: boolean, extra = ''): string {
  return `${SPM_CHIP} ${active ? SPM_CHIP_ACTIVE : SPM_CHIP_IDLE}${extra ? ` ${extra}` : ''}`;
}

export function spmSegClass(active: boolean, extra = ''): string {
  return `min-h-8 rounded-lg px-3 text-[12px] font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--spm-acc)] ${
    active ? SPM_SEG_ACTIVE : SPM_SEG_IDLE
  }${extra ? ` ${extra}` : ''}`;
}
