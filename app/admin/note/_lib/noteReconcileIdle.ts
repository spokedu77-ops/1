/** 키 입력·구조 변경 후 idle — 타이핑 중 reconcile 방지 (부모·하위 문서 공통) */
export const NOTE_RECONCILE_IDLE_MS = 3000;
export const NOTE_RECONCILE_REMOTE_MS = 700;
export const NOTE_LOCAL_SAVE_SUPPRESS_MS = 3000;

export type NoteReconcileIdleHandler = (documentId: string) => void;

let idleHandler: NoteReconcileIdleHandler | null = null;
let idleTimer: ReturnType<typeof setTimeout> | undefined;
let pendingDocumentId: string | null = null;

const localSaveSuppressUntil = new Map<string, number>();

const PENDING_BLOCK_DELETE_MS = 15_000;
const pendingBlockDeletes = new Map<string, { until: number; ids: Set<string> }>();

/** soft delete 직후 legacy HTTP reconcile이 블록을 되살리지 않도록 억제 */
export function markPendingBlockDeletes(
  documentId: string,
  ids: string[],
  ms = PENDING_BLOCK_DELETE_MS,
): void {
  if (!documentId || ids.length === 0) return;
  const existing = pendingBlockDeletes.get(documentId);
  const idSet = existing?.ids ?? new Set<string>();
  for (const id of ids) idSet.add(id);
  pendingBlockDeletes.set(documentId, { until: Date.now() + ms, ids: idSet });
}

export function hasRecentBlockDeletes(documentId: string): boolean {
  const entry = pendingBlockDeletes.get(documentId);
  if (!entry) return false;
  if (Date.now() > entry.until) {
    pendingBlockDeletes.delete(documentId);
    return false;
  }
  return entry.ids.size > 0;
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
