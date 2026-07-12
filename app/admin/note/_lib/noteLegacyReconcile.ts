import { isNoteOplogSyncEnabled } from './noteOplogSync';

/**
 * HTTP `/blocks/load` + unionReconciled idle reconcile.
 * op-log 단일 파이프라인 전환 시 false — 롤백은 localStorage `spm-note-legacy-reconcile=1`.
 */
export const NOTE_LEGACY_RECONCILE_ENABLED = false;

const LEGACY_RECONCILE_LS_KEY = 'spm-note-legacy-reconcile';

/** idle HTTP reconcile + regression guard 병합 경로 사용 여부 */
export function isNoteLegacyReconcileEnabled(): boolean {
  if (typeof window !== 'undefined') {
    try {
      const override = window.localStorage.getItem(LEGACY_RECONCILE_LS_KEY);
      if (override === '1') return true;
      if (override === '0') return false;
    } catch {
      // ignore
    }
  }
  if (isNoteOplogSyncEnabled()) return NOTE_LEGACY_RECONCILE_ENABLED;
  return true;
}
