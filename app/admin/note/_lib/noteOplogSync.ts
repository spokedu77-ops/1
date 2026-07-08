/** Local-first op-log sync — admin/note 기본 경로 */
export const NOTE_OPLOG_SYNC_ENABLED = true;

export function isNoteOplogSyncEnabled(): boolean {
  if (!NOTE_OPLOG_SYNC_ENABLED) return false;
  if (typeof window === 'undefined') return NOTE_OPLOG_SYNC_ENABLED;
  try {
    const override = window.localStorage.getItem('spm-note-oplog-sync');
    if (override === '0') return false;
    if (override === '1') return true;
  } catch {
    // ignore
  }
  return NOTE_OPLOG_SYNC_ENABLED;
}
