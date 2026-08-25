/**
 * MASTER 전역 action grammar — 화면마다 다른 색·용어를 쓰지 않기 위한 SSOT.
 *
 * PRIMARY: 현재 화면의 핵심 완료 행동 (한 화면 원칙 1개) → spm-btn-primary
 * SECONDARY: 흐름을 돕는 저장/대체 행동 → border + slate
 * OPEN / VIEW: 현재 작업 열기 → slate-900
 * HISTORY: 누적 기록 읽기
 * DESTRUCTIVE: 제외 / 취소 / 영구 삭제 / 해지 — 낮은 emphasis, rose만 확정 버튼
 * STATUS: 예정·완료·취소·출석 — input이 아니라 badge/tone
 */

export const SPM_PRIMARY_BTN =
  'spm-btn-primary inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black disabled:opacity-40';

export const SPM_PRIMARY_BTN_FULL =
  'spm-btn-primary inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-black disabled:opacity-40';

export const SPM_PRIMARY_BTN_TALL =
  'spm-btn-primary inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-black disabled:opacity-40';

export const SPM_OPEN_BTN =
  'inline-flex min-h-11 items-center justify-center gap-1 rounded-xl bg-slate-900 text-sm font-black text-white';

export const SPM_SECONDARY_BTN =
  'inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 disabled:opacity-40';

export const SPM_DESTRUCTIVE_BTN =
  'inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-rose-600 text-sm font-black text-white disabled:opacity-40';

export const MASTER_ACTION_COPY = {
  open: '열기',
  history: '이력 보기',
  execute: '실행',
  manage: '관리',
  addStudent: '학생 추가',
  createClass: '수업반 만들기',
  createSession: '수업 만들기',
  completeSession: '수업 완료',
  cancelSession: '수업 취소',
  restoreSession: '취소 해제',
  replaceSession: '대체 수업 만들기',
  deleteSession: '영구 삭제',
  removeFromClass: '반에서 제외',
  archiveStudent: '명단에서 보관',
} as const;
