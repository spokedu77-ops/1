import { dedupeNoteBlocksById } from '@/app/lib/note/noteBlockTree';
import type { NoteBlock } from './types';

type VisitCacheEntry = {
  blocks: NoteBlock[];
  savedAt: number;
};

const visitCache = new Map<string, VisitCacheEntry>();
const MEMORY_MAX_ENTRIES = 48;
/** In-memory hot cache — sessionStorage가 더 오래 보관 */
const MEMORY_MAX_AGE_MS = 30 * 60_000;
/** Notion처럼 탭/새로고침 후에도 즉시 표시 */
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60_000;
const SESSION_MAX_ENTRIES = 64;
const SESSION_STORAGE_KEY = 'spm-note-doc-blocks-v1';

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

function pruneMemoryCache() {
  const now = Date.now();
  for (const [id, entry] of visitCache) {
    if (now - entry.savedAt > MEMORY_MAX_AGE_MS) visitCache.delete(id);
  }
  while (visitCache.size > MEMORY_MAX_ENTRIES) {
    const oldest = visitCache.keys().next().value;
    if (oldest) visitCache.delete(oldest);
  }
}

type SessionPayload = Record<string, { b: NoteBlock[]; t: number }>;

function readSessionPayload(): SessionPayload {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SessionPayload;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeSessionPayload(payload: SessionPayload) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    const ids = Object.entries(payload).sort((a, b) => a[1].t - b[1].t);
    while (ids.length > SESSION_MAX_ENTRIES / 2) {
      delete payload[ids.shift()![0]];
    }
    try {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // quota — session cache is best-effort
    }
  }
}

function pruneSessionPayload(payload: SessionPayload): SessionPayload {
  const now = Date.now();
  const next: SessionPayload = {};
  for (const [id, entry] of Object.entries(payload)) {
    if (now - entry.t <= SESSION_MAX_AGE_MS) next[id] = entry;
  }
  const sorted = Object.entries(next).sort((a, b) => b[1].t - a[1].t);
  return Object.fromEntries(sorted.slice(0, SESSION_MAX_ENTRIES));
}

function readSessionEntry(documentId: string): VisitCacheEntry | null {
  const payload = readSessionPayload();
  const entry = payload[documentId];
  if (!entry) return null;
  if (Date.now() - entry.t > SESSION_MAX_AGE_MS) return null;
  return { blocks: cloneBlocks(entry.b), savedAt: entry.t };
}

function writeSessionEntry(documentId: string, entry: VisitCacheEntry) {
  const payload = pruneSessionPayload(readSessionPayload());
  payload[documentId] = { b: cloneBlocks(entry.blocks), t: entry.savedAt };
  writeSessionPayload(pruneSessionPayload(payload));
}

function readEntry(documentId: string): VisitCacheEntry | null {
  const memory = visitCache.get(documentId);
  if (memory && Date.now() - memory.savedAt <= MEMORY_MAX_AGE_MS) {
    return { blocks: cloneBlocks(memory.blocks), savedAt: memory.savedAt };
  }
  if (memory) visitCache.delete(documentId);

  const session = readSessionEntry(documentId);
  if (session) {
    visitCache.set(documentId, { blocks: cloneBlocks(session.blocks), savedAt: session.savedAt });
    return session;
  }
  return null;
}

const CACHE_SHRINK_GUARD_MIN_BLOCKS = 5;
const CACHE_SHRINK_GUARD_RATIO = 0.6;

function shouldSkipSuspiciousCacheShrink(
  previous: NoteBlock[],
  incoming: NoteBlock[],
): boolean {
  if (incoming.length === 0 || previous.length < CACHE_SHRINK_GUARD_MIN_BLOCKS) return false;
  if (incoming.length >= previous.length * CACHE_SHRINK_GUARD_RATIO) return false;
  const previousIds = new Set(previous.map((block) => block.id));
  const incomingFromPrevious = incoming.every((block) => previousIds.has(block.id));
  return incomingFromPrevious;
}

export type RememberNoteDocumentBlocksOptions = {
  /** 서버 load/reconcile 경로 — UI 글리치로 줄어든 스냅샷도 그대로 저장 */
  trustServer?: boolean;
};

/** 문서 전환·새로고침 시 즉시 표시 — Notion stale-while-revalidate 스냅샷 */
export function rememberNoteDocumentBlocks(
  documentId: string,
  blocks: NoteBlock[],
  options?: RememberNoteDocumentBlocksOptions,
): void {
  if (!documentId) return;
  const incoming = dedupeNoteBlocksById(
    blocks.filter((block) => block.document_id === documentId),
  );
  if (blocks.length > 0 && incoming.length === 0) return;

  if (!options?.trustServer) {
    const existing = readEntry(documentId);
    if (existing && shouldSkipSuspiciousCacheShrink(existing.blocks, incoming)) {
      return;
    }
  }

  const entry: VisitCacheEntry = {
    blocks: cloneBlocks(incoming),
    savedAt: Date.now(),
  };
  pruneMemoryCache();
  visitCache.set(documentId, entry);
  writeSessionEntry(documentId, entry);
}

/**
 * null = 한 번도 본 적 없음(스켈레톤)
 * []   = 빈 문서를 이미 로드함(빈 편집기)
 */
export function readRememberedNoteDocumentBlocks(documentId: string): NoteBlock[] | null {
  const entry = readEntry(documentId);
  if (!entry) return null;
  return cloneBlocks(entry.blocks);
}

export function invalidateRememberedNoteDocumentBlocks(documentId?: string): void {
  if (documentId) {
    visitCache.delete(documentId);
    if (typeof window !== 'undefined') {
      const payload = readSessionPayload();
      delete payload[documentId];
      writeSessionPayload(payload);
    }
    return;
  }
  visitCache.clear();
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}
