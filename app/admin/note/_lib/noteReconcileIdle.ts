/** 키 입력·구조 변경 후 idle — 타이핑 중 reconcile 방지 (부모·하위 문서 공통) */
export const NOTE_RECONCILE_IDLE_MS = 3000;

export type NoteReconcileIdleHandler = (documentId: string) => void;

let idleHandler: NoteReconcileIdleHandler | null = null;
let idleTimer: ReturnType<typeof setTimeout> | undefined;
let pendingDocumentId: string | null = null;

export function registerNoteReconcileIdleHandler(handler: NoteReconcileIdleHandler | null): void {
  idleHandler = handler;
}

export function cancelNoteReconcileIdle(): void {
  if (idleTimer !== undefined) {
    clearTimeout(idleTimer);
    idleTimer = undefined;
  }
  pendingDocumentId = null;
}

/** 편집·구조 변경 시 reconcile 타이머를 idle 구간만큼 뒤로 미룬다 */
export function bumpNoteReconcileIdle(documentId: string | null | undefined): void {
  if (!documentId || !idleHandler) return;
  pendingDocumentId = documentId;
  if (idleTimer !== undefined) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    idleTimer = undefined;
    if (pendingDocumentId === documentId) {
      idleHandler!(documentId);
    }
  }, NOTE_RECONCILE_IDLE_MS);
}

/** 문서 로드 직후 첫 reconcile 예약 */
export function scheduleNoteReconcileIdle(documentId: string): void {
  bumpNoteReconcileIdle(documentId);
}
