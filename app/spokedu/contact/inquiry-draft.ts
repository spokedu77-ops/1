import type { InquiryPayload } from './inquiry-types';

export const TEMP_INQUIRY_STORAGE_KEY = 'spokedu.contact.inquiries.temp';

export type StoredInquiryDraft = {
  savedAt: string;
  payload: InquiryPayload;
};

export function loadStoredInquiryDraft(): StoredInquiryDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(TEMP_INQUIRY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredInquiryDraft | StoredInquiryDraft[];
    if (Array.isArray(parsed)) {
      const first = parsed[0];
      return first?.payload ? { savedAt: first.savedAt ?? new Date().toISOString(), payload: first.payload } : null;
    }
    if (parsed?.payload) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function storeInquiryDraft(payload: InquiryPayload): void {
  if (typeof window === 'undefined') return;
  try {
    const draft: StoredInquiryDraft = {
      savedAt: new Date().toISOString(),
      payload,
    };
    window.localStorage.setItem(TEMP_INQUIRY_STORAGE_KEY, JSON.stringify(draft));
  } catch (error) {
    console.warn('[spokedu/contact] temp inquiry store failed', error);
  }
}

export function clearStoredInquiryDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(TEMP_INQUIRY_STORAGE_KEY);
  } catch (error) {
    console.warn('[spokedu/contact] temp inquiry clear failed', error);
  }
}

/** @deprecated 이전 배열 형식 호환 */
export function migrateLegacyInquiryStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(TEMP_INQUIRY_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed) && parsed[0] && typeof parsed[0] === 'object' && 'type' in (parsed[0] as object)) {
      storeInquiryDraft(parsed[0] as InquiryPayload);
    }
  } catch {
    // ignore
  }
}
