'use client';

import { dedupeNoteBlocksById } from '@/app/lib/note/noteBlockTree';
import { prepareLoadedNoteBlocks } from '../_components/noteBulletInput';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import { noteBlocksLoadPath } from './noteBlocksLoad';
import {
  readRememberedNoteDocumentBlocks,
  rememberNoteDocumentBlocks,
} from './noteDocumentBlocksCache';
import { mergeBlocksWithStoreContent } from './noteBlockStateMerge';
import type { NoteBlock } from './types';

/** 문서 open 시 engine이 제공해야 하는 최소 API */
export type NoteDocumentOpenEngine = {
  isOplogSyncEnabled: () => boolean;
  syncWithServer: (
    initialBlocks: NoteBlock[],
    options?: { skipDispatch?: boolean },
  ) => Promise<void>;
  replaceBlocks: (blocks: NoteBlock[]) => void;
  getBlocks: () => NoteBlock[];
};

export type OpenNoteDocumentResult = {
  blocks: NoteBlock[];
  emptyConfirmed: boolean;
  toggleMigration: ReturnType<typeof prepareLoadedNoteBlocks>['toggleMigration'];
};

/**
 * Notion-style SWR: 세션/메모리 캐시만 즉시 표시.
 * IndexedDB hydrate는 open 시 별도 paint 하지 않음 — syncWithServer가 IDB를 읽는다.
 */
export function paintInstantSnapshotFromCache(
  documentId: string,
  engine: NoteDocumentOpenEngine,
  currentDocBlockCount: number,
): boolean {
  if (currentDocBlockCount > 0) return false;
  const remembered = readRememberedNoteDocumentBlocks(documentId);
  if (!remembered || remembered.length === 0) return false;
  engine.replaceBlocks(remembered);
  useNoteBlockStore.getState().setActiveDocumentId(documentId);
  return true;
}

/** bootstrap → prefetch → network 순으로 서버 스냅샷 확보 */
export async function fetchServerBlocksForOpen(
  documentId: string,
  options?: {
    bootstrapBlocks?: NoteBlock[] | null;
    prefetchedBlocks?: NoteBlock[] | null;
  },
): Promise<NoteBlock[]> {
  if (options?.bootstrapBlocks != null) {
    return options.bootstrapBlocks;
  }
  if (options?.prefetchedBlocks && options.prefetchedBlocks.length > 0) {
    return options.prefetchedBlocks;
  }
  const res = await fetch(noteBlocksLoadPath(documentId), { credentials: 'include' });
  if (!res.ok) {
    const j = await res.json().catch(() => null);
    throw new Error((j as { error?: string } | null)?.error || '블록 로드 실패');
  }
  const json = (await res.json()) as { blocks: NoteBlock[] };
  return json.blocks ?? [];
}

/**
 * 서버 스냅샷 1회 적용 — op-log: coordinator merge + reducer syncSnapshot 단일 dispatch.
 * hook 레벨 remember union / finishOplogLoadFallback 없음.
 */
export async function applyOpenServerSnapshot(
  documentId: string,
  serverBlocks: NoteBlock[],
  engine: NoteDocumentOpenEngine,
): Promise<OpenNoteDocumentResult> {
  const { blocks: prepared, toggleMigration } = prepareLoadedNoteBlocks(serverBlocks);
  const normalized = dedupeNoteBlocksById(prepared);
  const serverForDoc = normalized.filter((block) => block.document_id === documentId);

  useNoteBlockStore.getState().setActiveDocumentId(documentId);

  if (engine.isOplogSyncEnabled()) {
    await engine.syncWithServer(normalized);
  } else {
    engine.replaceBlocks(normalized);
  }

  const current = engine.getBlocks().filter((block) => block.document_id === documentId);
  const emptyConfirmed = current.length === 0 && serverForDoc.length === 0;

  rememberNoteDocumentBlocks(
    documentId,
    mergeBlocksWithStoreContent(current),
    {
      trustServer: true,
      serverConfirmedEmpty: emptyConfirmed,
    },
  );

  return {
    blocks: current,
    emptyConfirmed,
    toggleMigration,
  };
}

export type OpenNoteDocumentOptions = {
  documentId: string;
  engine: NoteDocumentOpenEngine;
  bootstrapBlocks?: NoteBlock[] | null;
  prefetchedBlocks?: NoteBlock[] | null;
};

/**
 * 문서 open 단일 경로.
 * 1) fetch blocks/load 2) applyOpenServerSnapshot 1회
 * (SWR 캐시 즉시 paint는 서버 load 전 stale 토글·빈 껍데기를 유발하므로 사용하지 않음)
 */
export async function openNoteDocument(
  options: OpenNoteDocumentOptions,
): Promise<OpenNoteDocumentResult> {
  const {
    documentId,
    engine,
    bootstrapBlocks,
    prefetchedBlocks,
  } = options;

  const serverBlocks = await fetchServerBlocksForOpen(documentId, {
    bootstrapBlocks,
    prefetchedBlocks,
  });

  return applyOpenServerSnapshot(documentId, serverBlocks, engine);
}
