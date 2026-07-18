import type { NoteBlock } from './types';

const STORAGE_KEY = 'spm-note-emergency-drafts-v1';

export type NoteEmergencyDraft = {
  documentId: string;
  blockId: string;
  content: Record<string, unknown>;
  updatedAt: number;
};

type DraftMap = Record<string, NoteEmergencyDraft>;

function draftKey(documentId: string, blockId: string): string {
  return `${documentId}:${blockId}`;
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage ?? null;
}

function readDraftMap(storage = getStorage()): DraftMap {
  if (!storage) return {};
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed as DraftMap : {};
  } catch {
    return {};
  }
}

function writeDraftMap(map: DraftMap, storage = getStorage()): void {
  if (!storage) return;
  const keys = Object.keys(map);
  if (keys.length === 0) {
    storage.removeItem(STORAGE_KEY);
    return;
  }
  storage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function saveNoteEmergencyDraft(
  documentId: string,
  blockId: string,
  content: Record<string, unknown>,
  storage = getStorage(),
): void {
  const map = readDraftMap(storage);
  map[draftKey(documentId, blockId)] = {
    documentId,
    blockId,
    content,
    updatedAt: Date.now(),
  };
  writeDraftMap(map, storage);
}

export function clearNoteEmergencyDraft(
  documentId: string,
  blockId: string,
  storage = getStorage(),
): void {
  const map = readDraftMap(storage);
  delete map[draftKey(documentId, blockId)];
  writeDraftMap(map, storage);
}

export function clearNoteEmergencyDrafts(
  documentId: string,
  blockIds: Iterable<string>,
  storage = getStorage(),
): void {
  const map = readDraftMap(storage);
  for (const blockId of blockIds) {
    delete map[draftKey(documentId, blockId)];
  }
  writeDraftMap(map, storage);
}

export function listNoteEmergencyDrafts(
  documentId: string,
  storage = getStorage(),
): NoteEmergencyDraft[] {
  return Object.values(readDraftMap(storage))
    .filter((draft) => draft.documentId === documentId)
    .sort((a, b) => a.updatedAt - b.updatedAt);
}

export function applyNoteEmergencyDrafts(
  documentId: string,
  blocks: NoteBlock[],
  storage = getStorage(),
): { blocks: NoteBlock[]; recovered: NoteEmergencyDraft[] } {
  const drafts = new Map(listNoteEmergencyDrafts(documentId, storage).map((draft) => [draft.blockId, draft]));
  if (drafts.size === 0) return { blocks, recovered: [] };

  const recovered: NoteEmergencyDraft[] = [];
  const nextBlocks = blocks.map((block) => {
    const draft = drafts.get(block.id);
    if (!draft) return block;
    const serverUpdatedAt = Date.parse(block.updated_at ?? '');
    if (Number.isFinite(serverUpdatedAt) && serverUpdatedAt >= draft.updatedAt) {
      return block;
    }
    const currentContent = block.content && typeof block.content === 'object'
      ? block.content as Record<string, unknown>
      : {};
    const nextContent = { ...currentContent, ...draft.content };
    if (JSON.stringify(nextContent) === JSON.stringify(currentContent)) return block;
    recovered.push(draft);
    return { ...block, content: nextContent };
  });

  return { blocks: nextBlocks, recovered };
}
