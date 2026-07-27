/**
 * sessionStorage drafts for in-progress save forms (class-record / report / quick record).
 * Survives refresh in the same tab; cleared after successful save.
 * Owner-scoped keys prevent account-switch contamination in the same tab.
 */

export const CLASS_RECORD_DRAFT_KEY = 'spm-class-record-draft-v1';
export const REPORT_DRAFT_KEY = 'spm-report-draft-v1';
export const QUICK_RECORD_DRAFT_KEY = 'spm-quick-record-draft-v1';

export function scopedSaveDraftKey(baseKey: string, ownerId: string | null | undefined): string {
  const owner = ownerId?.trim();
  if (!owner) return baseKey;
  return `${baseKey}:${owner}`;
}

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

/** Prefer owner-scoped draft; migrate legacy unscoped key once when owner is known. */
export function readOwnerSaveDraft<T>(baseKey: string, ownerId: string | null | undefined): T | null {
  const scopedKey = scopedSaveDraftKey(baseKey, ownerId);
  const scoped = readSaveDraft<T>(scopedKey);
  if (scoped != null) return scoped;
  if (!ownerId?.trim()) return readSaveDraft<T>(baseKey);

  const legacy = readSaveDraft<T>(baseKey);
  if (legacy == null) return null;
  writeSaveDraft(scopedKey, legacy);
  clearSaveDraft(baseKey);
  return legacy;
}

export function writeOwnerSaveDraft(
  baseKey: string,
  ownerId: string | null | undefined,
  value: unknown,
): void {
  writeSaveDraft(scopedSaveDraftKey(baseKey, ownerId), value);
  if (ownerId?.trim()) clearSaveDraft(baseKey);
}

export function clearOwnerSaveDraft(baseKey: string, ownerId: string | null | undefined): void {
  clearSaveDraft(scopedSaveDraftKey(baseKey, ownerId));
  if (ownerId?.trim()) clearSaveDraft(baseKey);
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
