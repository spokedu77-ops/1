/** 키 입력·구조 변경 후 idle — 타이핑 중 reconcile 방지 (부모·하위 문서 공통) */
export const NOTE_RECONCILE_IDLE_MS = 3000;
export const NOTE_RECONCILE_REMOTE_MS = 700;
export const NOTE_LOCAL_SAVE_SUPPRESS_MS = 3000;

export type NoteReconcileIdleHandler = (documentId: string) => void;

let idleHandler: NoteReconcileIdleHandler | null = null;
let idleTimer: ReturnType<typeof setTimeout> | undefined;
let pendingDocumentId: string | null = null;

const localSaveSuppressUntil = new Map<string, number>();

import {
  addStructuralExcludeIds,
  getStructuralExcludeIds,
  hasStructuralExcludeIds,
} from './noteStructuralExcludeRegistry';

/** soft delete·이동 직후 — outbound push ack 전까지 되살림 방지 */
export function markPendingBlockDeletes(documentId: string, ids: string[]): void {
  addStructuralExcludeIds(documentId, ids);
}

export function hasRecentBlockDeletes(documentId: string): boolean {
  return hasStructuralExcludeIds(documentId);
}

/** @deprecated noteStructuralExcludeRegistry.getStructuralExcludeIds 사용 */
export function getPendingBlockDeleteIds(documentId: string): Set<string> {
  return getStructuralExcludeIds(documentId);
}

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

/** 로컬 PATCH 직후 Realtime self-invalidation reconcile 억제 */
export function markNoteLocalSave(documentId: string, ms = NOTE_LOCAL_SAVE_SUPPRESS_MS): void {
  localSaveSuppressUntil.set(documentId, Date.now() + ms);
}

export function isNoteLocalSaveSuppressed(documentId: string): boolean {
  const until = localSaveSuppressUntil.get(documentId);
  if (!until) return false;
  if (Date.now() > until) {
    localSaveSuppressUntil.delete(documentId);
    return false;
  }
  return true;
}

/** 편집·구조 변경 시 reconcile 타이머를 idle 구간만큼 뒤로 미룬다 */
export function bumpNoteReconcileIdle(
  documentId: string | null | undefined,
  delayMs = NOTE_RECONCILE_IDLE_MS,
): void {
  if (!documentId || !idleHandler) return;
  pendingDocumentId = documentId;
  if (idleTimer !== undefined) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    idleTimer = undefined;
    if (pendingDocumentId === documentId) {
      idleHandler!(documentId);
    }
  }, delayMs);
}

/** 문서 로드 직후 첫 reconcile 예약 */
export function scheduleNoteReconcileIdle(documentId: string): void {
  bumpNoteReconcileIdle(documentId);
}

/** realtime 원격 변경은 빠르게 감지하되 짧게 coalesce한다. */
export function scheduleNoteReconcileRemote(documentId: string): void {
  bumpNoteReconcileIdle(documentId, NOTE_RECONCILE_REMOTE_MS);
}
