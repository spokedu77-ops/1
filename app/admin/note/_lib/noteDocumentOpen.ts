'use client';

import { dedupeNoteBlocksById } from '@/app/lib/note/noteBlockTree';
import { prepareLoadedNoteBlocks } from '../_components/noteBulletInput';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import { noteBlocksLoadPath } from './noteBlocksLoad';
import { traceApiEgress } from './noteFlickerTrace';
import {
  readRememberedNoteDocumentBlocks,
  rememberNoteDocumentBlocks,
} from './noteDocumentBlocksCache';
import { mergeBlocksWithStoreContent } from './noteBlockStateMerge';
import { readLocalDocument } from './noteLocalDb';
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
  traceApiEgress('blocksLoad', documentId);
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

/**
 * 문서 전환 직후 첫 paint 전에 세션 캐시를 동기 적용 (스켈레톤 깜빡임 방지).
 * hook은 openNoteDocument와 함께만 호출 — merge/load 분기는 이 파일에만 둔다.
 */
export function prepareNoteDocumentOpenSync(
  documentId: string,
  engine: NoteDocumentOpenEngine,
): { hasCache: boolean; emptyConfirmed: boolean } {
  const remembered = readRememberedNoteDocumentBlocks(documentId);
  if (remembered === null) {
    return { hasCache: false, emptyConfirmed: false };
  }
  if (remembered.length > 0) {
    paintInstantSnapshotFromCache(documentId, engine, 0);
    return { hasCache: true, emptyConfirmed: false };
  }
  engine.replaceBlocks([]);
  useNoteBlockStore.getState().setActiveDocumentId(documentId);
  return { hasCache: true, emptyConfirmed: true };
}

/** session 캐시가 없을 때 IDB 스냅샷을 network 전에 paint */
export async function paintInstantSnapshotFromLocalDb(
  documentId: string,
  engine: NoteDocumentOpenEngine,
): Promise<boolean> {
  const currentForDoc = engine.getBlocks().filter((block) => block.document_id === documentId);
  if (currentForDoc.length > 0) return false;

  const local = await readLocalDocument(documentId);
  if (!local || local.blocks.length === 0) return false;

  const forDoc = local.blocks.filter((block) => block.document_id === documentId);
  if (forDoc.length === 0) return false;

  engine.replaceBlocks(forDoc);
  useNoteBlockStore.getState().setActiveDocumentId(documentId);
  return true;
}

export type OpenNoteDocumentOptions = {
  documentId: string;
  engine: NoteDocumentOpenEngine;
  bootstrapBlocks?: NoteBlock[] | null;
  prefetchedBlocks?: NoteBlock[] | null;
};

/**
 * 문서 open 단일 경로.
 * 1) (동기) prepareNoteDocumentOpenSync — 세션 캐시 즉시 paint
 * 2) fetch blocks/load 3) applyOpenServerSnapshot 1회
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

  if (!bootstrapBlocks) {
    await paintInstantSnapshotFromLocalDb(documentId, engine);
  }

  const serverBlocks = await fetchServerBlocksForOpen(documentId, {
    bootstrapBlocks,
    prefetchedBlocks,
  });

  return applyOpenServerSnapshot(documentId, serverBlocks, engine);
}
