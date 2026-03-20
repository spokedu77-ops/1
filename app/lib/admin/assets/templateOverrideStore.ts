/**
 * IndexedDB 기반 Challenge 템플릿 오버라이드 저장소.
 *
 * localStorage 는 5~10 MB 한도가 있어 base64 이미지가 포함되면 조용히 실패함.
 * IndexedDB 는 사실상 디스크 여유 공간에 비례한 대용량 키-값 저장이 가능.
 */

const DB_NAME = 'iiwarmup_challenge_db';
const DB_VERSION = 1;
const STORE_NAME = 'template_overrides';

export type TemplateOverrideEntry = {
  bpm: number;
  level: number;
  grid: string[];
  gridsByLevel?: Record<number, string[]>;
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** DB에 저장된 모든 오버라이드를 한 번에 읽어온다. */
export async function getAllOverrides(): Promise<Record<string, TemplateOverrideEntry>> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const result: Record<string, TemplateOverrideEntry> = {};

    const cursorRequest = store.openCursor();
    cursorRequest.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
      if (cursor) {
        result[cursor.key as string] = cursor.value as TemplateOverrideEntry;
        cursor.continue();
      } else {
        resolve(result);
      }
    };
    cursorRequest.onerror = () => reject(cursorRequest.error);
  });
}

/** 특정 템플릿의 오버라이드를 저장(upsert)한다. */
export async function putOverride(
  templateId: string,
  override: TemplateOverrideEntry
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(override, templateId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
