/**
 * sessionStorage drafts for in-progress save forms (class-record / report / quick record).
 * Survives refresh in the same tab; cleared after successful save.
 */

export const CLASS_RECORD_DRAFT_KEY = 'spm-class-record-draft-v1';
export const REPORT_DRAFT_KEY = 'spm-report-draft-v1';
export const QUICK_RECORD_DRAFT_KEY = 'spm-quick-record-draft-v1';

export function readSaveDraft<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeSaveDraft(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota / private mode — ignore.
  }
}

export function clearSaveDraft(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function hasMeaningfulClassRecordDraft(draft: {
  classMemo?: string;
  classId?: string;
  attendance?: Record<string, string>;
} | null): boolean {
  if (!draft) return false;
  if (draft.classMemo?.trim()) return true;
  if (draft.classId?.trim() && draft.classId.trim() !== '수업') return true;
  if (draft.attendance && Object.values(draft.attendance).some((status) => status !== 'pending')) {
    return true;
  }
  return false;
}
