import type { NoteBlock } from './types';

type VisitCacheEntry = {
  blocks: NoteBlock[];
  savedAt: number;
};

const visitCache = new Map<string, VisitCacheEntry>();
const MAX_ENTRIES = 12;
const MAX_AGE_MS = 10 * 60_000;

function pruneVisitCache() {
  const now = Date.now();
  for (const [id, entry] of visitCache) {
    if (now - entry.savedAt > MAX_AGE_MS) visitCache.delete(id);
  }
  while (visitCache.size > MAX_ENTRIES) {
    const oldest = visitCache.keys().next().value;
    if (oldest) visitCache.delete(oldest);
  }
}

function cloneBlocks(blocks: NoteBlock[]): NoteBlock[] {
  return blocks.map((block) => ({
    ...block,
    content: block.content != null
      ? (typeof block.content === 'object'
        ? { ...(block.content as Record<string, unknown>) }
        : block.content)
      : block.content,
  }));
}

/** 문서 전환 시 즉시 표시용 — 마지막으로 본 블록 스냅샷 */
export function rememberNoteDocumentBlocks(documentId: string, blocks: NoteBlock[]): void {
  if (!documentId) return;
  const snapshot = blocks.filter((block) => block.document_id === documentId);
  if (snapshot.length === 0) return;
  pruneVisitCache();
  visitCache.set(documentId, {
    blocks: cloneBlocks(snapshot),
    savedAt: Date.now(),
  });
}

/** 동기 읽기 — 있으면 즉시 렌더 (백그라운드 fetch는 별도) */
export function readRememberedNoteDocumentBlocks(documentId: string): NoteBlock[] | null {
  const entry = visitCache.get(documentId);
  if (!entry) return null;
  if (Date.now() - entry.savedAt > MAX_AGE_MS) {
    visitCache.delete(documentId);
    return null;
  }
  return cloneBlocks(entry.blocks);
}

export function invalidateRememberedNoteDocumentBlocks(documentId?: string): void {
  if (documentId) visitCache.delete(documentId);
  else visitCache.clear();
}
