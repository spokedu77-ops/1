import type { NoteBlock } from './types';

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
      `/api/admin/note/blocks/load?documentId=${encodeURIComponent(documentId)}&skipReconcile=true`,
      { credentials: 'include' },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { blocks?: NoteBlock[] };
    return json.blocks ?? [];
  } catch {
    return null;
  }
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
export async function consumePrefetchedNoteBlocks(
  documentId: string,
): Promise<NoteBlock[] | null> {
  const entry = cache.get(documentId);
  if (!entry) return null;
  cache.delete(documentId);
  if (entry.blocks) return entry.blocks;
  return entry.promise;
}

export function invalidatePrefetchedNoteBlocks(documentId?: string): void {
  if (documentId) cache.delete(documentId);
  else cache.clear();
}
