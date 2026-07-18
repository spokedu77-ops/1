import type { NoteBlock } from './types';
import { noteBlocksLoadPath } from './noteBlocksLoad';

type PrefetchEntry = {
  promise: Promise<NoteBlock[] | null>;
  blocks: NoteBlock[] | null;
  fetchedAt: number;
};

const cache = new Map<string, PrefetchEntry>();
const MAX_ENTRIES = 6;
const MAX_AGE_MS = 60_000;

function pruneCache() {
  const now = Date.now();
  for (const [id, entry] of cache) {
    if (now - entry.fetchedAt > MAX_AGE_MS) cache.delete(id);
  }
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
}

async function fetchBlocks(documentId: string): Promise<NoteBlock[] | null> {
  try {
    const res = await fetch(
      noteBlocksLoadPath(documentId),
      { credentials: 'include' },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { blocks?: NoteBlock[] };
    return json.blocks ?? [];
  } catch {
    return null;
  }
}

/** prefetch 완료·진행 중 엔트리 (consume 전) */
export function getReadyPrefetchedBlocks(documentId: string): NoteBlock[] | null {
  const entry = cache.get(documentId);
  if (!entry?.blocks || entry.blocks.length === 0) return null;
  return entry.blocks;
}

/** 클릭 직전 — 완료될 때까지 대기 (이미 remember 되어 있으면 생략) */
export async function awaitPrefetchedNoteBlocks(
  documentId: string,
  timeoutMs = 12_000,
): Promise<NoteBlock[] | null> {
  const ready = getReadyPrefetchedBlocks(documentId);
  if (ready) return ready;
  prefetchNoteDocumentBlocks(documentId);
  const entry = cache.get(documentId);
  if (!entry) return null;
  const raced = await Promise.race([
    entry.promise,
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), timeoutMs);
    }),
  ]);
  return raced && raced.length > 0 ? raced : null;
}

/** 사이드바 hover — 문서 클릭 전 블록 로드 선행 */
export function prefetchNoteDocumentBlocks(documentId: string): void {
  if (!documentId || cache.has(documentId)) return;
  pruneCache();
  const entry: PrefetchEntry = {
    promise: fetchBlocks(documentId).then((blocks) => {
      entry.blocks = blocks;
      entry.fetchedAt = Date.now();
      return blocks;
    }),
    blocks: null,
    fetchedAt: Date.now(),
  };
  cache.set(documentId, entry);
}

/** 선택 시 prefetch 결과 사용 — 없으면 null */
export function primePrefetchedNoteBlocks(documentId: string, blocks: NoteBlock[]): void {
  if (!documentId) return;
  pruneCache();
  cache.set(documentId, {
    promise: Promise.resolve(blocks),
    blocks,
    fetchedAt: Date.now(),
  });
}

export async function consumePrefetchedNoteBlocks(
  documentId: string,
): Promise<NoteBlock[] | null> {
  const entry = cache.get(documentId);
  if (!entry) return null;
  cache.delete(documentId);
  const blocks = entry.blocks ? entry.blocks : await entry.promise;
  return blocks;
}

export function invalidatePrefetchedNoteBlocks(documentId?: string): void {
  if (documentId) cache.delete(documentId);
  else cache.clear();
}
