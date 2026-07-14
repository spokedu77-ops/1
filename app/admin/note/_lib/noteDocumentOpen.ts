'use client';

import { dedupeNoteBlocksById } from '@/app/lib/note/noteBlockTree';
import { prepareLoadedNoteBlocks } from '../_components/noteBulletInput';
import { useNoteBlockStore, selectDocumentBlocks } from '../_store/noteBlockStore';
import { noteBlocksLoadPath } from './noteBlocksLoad';
import { getReadyPrefetchedBlocks } from './noteDocumentBlocksPrefetch';
import { traceApiEgress } from './noteFlickerTrace';
import {
  readRememberedNoteDocumentBlocks,
  rememberNoteDocumentBlocks,
} from './noteDocumentBlocksCache';
import {
  documentContentAheadOfSnapshot,
  mergeBlocksWithStoreContent,
} from './noteBlockStateMerge';
import { shouldKeepLocalOverEmptyServerAuthority } from './noteAuthority';
import { getStructuralExcludeIds } from './noteStructuralExcludeRegistry';
import { readLocalDocument, readLocalDocumentMemory } from './noteLocalDb';
import { isNoteOplogSyncEnabled } from './noteOplogSync';
import type { NoteBlock } from './types';

/** 문서 open 시 engine이 제공해야 하는 최소 API */
export type NoteDocumentOpenEngine = {
  isOplogSyncEnabled: () => boolean;
  syncWithServer: (
    initialBlocks: NoteBlock[],
    options?: { skipDispatch?: boolean; emptyConfirmed?: boolean },
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
  useNoteBlockStore.getState().setActiveDocumentId(documentId);
  engine.replaceBlocks(remembered);
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
  const res = await fetch(
    noteBlocksLoadPath(documentId, {
      skipServerMigration: isNoteOplogSyncEnabled(),
    }),
    { credentials: 'include', cache: 'no-store' },
  );
  if (!res.ok) {
    const j = await res.json().catch(() => null);
    throw new Error((j as { error?: string } | null)?.error || '블록 로드 실패');
  }
  const json = (await res.json()) as { blocks: NoteBlock[] };
  return json.blocks ?? [];
}

function readLocalBlocksForOpen(documentId: string): NoteBlock[] {
  return mergeBlocksWithStoreContent(
    selectDocumentBlocks(useNoteBlockStore.getState(), documentId),
  );
}

function shouldKeepLocalOverEmptyServer(
  localBlocks: NoteBlock[],
  serverBlocks: NoteBlock[],
  documentId: string,
): boolean {
  return shouldKeepLocalOverEmptyServerAuthority({
    localBlocks,
    serverBlocks,
    pendingLeaveIds: getStructuralExcludeIds(documentId),
  });
}

function finishOpenWithLocalBlocks(
  documentId: string,
  localBlocks: NoteBlock[],
  toggleMigration: ReturnType<typeof prepareLoadedNoteBlocks>['toggleMigration'],
): OpenNoteDocumentResult {
  rememberNoteDocumentBlocks(documentId, localBlocks, { trustServer: false });
  return {
    blocks: localBlocks,
    emptyConfirmed: false,
    toggleMigration,
  };
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

  const localBeforeSync = readLocalBlocksForOpen(documentId);
  if (shouldKeepLocalOverEmptyServer(localBeforeSync, serverForDoc, documentId)) {
    return finishOpenWithLocalBlocks(
      documentId,
      localBeforeSync,
      toggleMigration,
    );
  }
  if (documentContentAheadOfSnapshot(localBeforeSync, serverForDoc)) {
    return finishOpenWithLocalBlocks(
      documentId,
      localBeforeSync,
      toggleMigration,
    );
  }

  const emptyConfirmed = serverForDoc.length === 0
    && !shouldKeepLocalOverEmptyServer(localBeforeSync, serverForDoc, documentId);

  if (engine.isOplogSyncEnabled()) {
    await engine.syncWithServer(normalized, { emptyConfirmed });
  } else {
    engine.replaceBlocks(normalized);
  }

  if (shouldKeepLocalOverEmptyServer(readLocalBlocksForOpen(documentId), serverForDoc, documentId)) {
    return finishOpenWithLocalBlocks(
      documentId,
      readLocalBlocksForOpen(documentId),
      toggleMigration,
    );
  }

  const current = engine.getBlocks().filter((block) => block.document_id === documentId);
  const confirmedEmpty = current.length === 0 && serverForDoc.length === 0;

  rememberNoteDocumentBlocks(
    documentId,
    mergeBlocksWithStoreContent(current),
    {
      trustServer: true,
      serverConfirmedEmpty: confirmedEmpty,
    },
  );

  return {
    blocks: current,
    emptyConfirmed: confirmedEmpty,
    toggleMigration,
  };
}

/**
 * 문서 전환 직후 첫 paint 전에 세션 캐시를 동기 적용 (스켈레톤 깜빡임 방지).
 * hook은 openNoteDocument와 함께만 호출 — merge/load 분기는 이 파일에만 둔다.
 */
function paintInstantBlocks(
  documentId: string,
  blocks: NoteBlock[],
  engine: NoteDocumentOpenEngine,
): void {
  const { blocks: prepared } = prepareLoadedNoteBlocks(blocks);
  const normalized = dedupeNoteBlocksById(prepared);
  // patchContent는 activeDocumentId와 block.document_id 일치를 요구 — replace 전에 설정
  useNoteBlockStore.getState().setActiveDocumentId(documentId);
  engine.replaceBlocks(normalized);
  rememberNoteDocumentBlocks(
    documentId,
    mergeBlocksWithStoreContent(normalized.filter((block) => block.document_id === documentId)),
    { trustServer: true },
  );
}

/** bootstrap API가 layout 전에 도착했을 때 동기 paint */
export function paintBootstrapBlocksSync(
  documentId: string,
  blocks: NoteBlock[],
  engine: NoteDocumentOpenEngine,
): boolean {
  const currentForDoc = engine.getBlocks().filter((block) => block.document_id === documentId);
  if (currentForDoc.length > 0) return false;
  if (blocks.length === 0) return false;
  paintInstantBlocks(documentId, blocks, engine);
  return true;
}

export function prepareNoteDocumentOpenSync(
  documentId: string,
  engine: NoteDocumentOpenEngine,
): { hasCache: boolean; emptyConfirmed: boolean } {
  const remembered = readRememberedNoteDocumentBlocks(documentId);
  if (remembered === null) {
    const prefetched = getReadyPrefetchedBlocks(documentId);
    if (prefetched && prefetched.length > 0) {
      paintInstantBlocks(documentId, prefetched, engine);
      return { hasCache: true, emptyConfirmed: false };
    }
    const localMemory = readLocalDocumentMemory(documentId);
    if (localMemory && localMemory.blocks.length > 0) {
      paintInstantBlocks(documentId, localMemory.blocks, engine);
      return { hasCache: true, emptyConfirmed: false };
    }
    return { hasCache: false, emptyConfirmed: false };
  }
  if (remembered.length > 0) {
    paintInstantSnapshotFromCache(documentId, engine, 0);
    return { hasCache: true, emptyConfirmed: false };
  }
  const liveForDoc = selectDocumentBlocks(useNoteBlockStore.getState(), documentId);
  if (liveForDoc.length > 0) {
    useNoteBlockStore.getState().setActiveDocumentId(documentId);
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

  useNoteBlockStore.getState().setActiveDocumentId(documentId);
  engine.replaceBlocks(forDoc);
  return true;
}

export type OpenNoteDocumentOptions = {
  documentId: string;
  engine: NoteDocumentOpenEngine;
  bootstrapBlocks?: NoteBlock[] | null;
  prefetchedBlocks?: NoteBlock[] | null;
  /** fetch 완료 직전 — Strict Mode·문서 전환 레이스 시 stale apply 차단 */
  shouldAbort?: () => boolean;
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
    shouldAbort,
  } = options;

  if (!bootstrapBlocks) {
    await paintInstantSnapshotFromLocalDb(documentId, engine);
  }

  const serverBlocks = await fetchServerBlocksForOpen(documentId, {
    bootstrapBlocks,
    prefetchedBlocks,
  });

  if (shouldAbort?.()) {
    const local = readLocalBlocksForOpen(documentId);
    const { toggleMigration } = prepareLoadedNoteBlocks(serverBlocks);
    return finishOpenWithLocalBlocks(documentId, local, toggleMigration);
  }

  const localBeforeApply = readLocalBlocksForOpen(documentId);
  const serverForDoc = dedupeNoteBlocksById(
    prepareLoadedNoteBlocks(serverBlocks).blocks,
  ).filter((block) => block.document_id === documentId);
  if (documentContentAheadOfSnapshot(localBeforeApply, serverForDoc)) {
    const { toggleMigration } = prepareLoadedNoteBlocks(serverBlocks);
    return finishOpenWithLocalBlocks(documentId, localBeforeApply, toggleMigration);
  }

  return applyOpenServerSnapshot(documentId, serverBlocks, engine);
}
