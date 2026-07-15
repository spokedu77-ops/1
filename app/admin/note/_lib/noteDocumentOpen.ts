'use client';

import { dedupeNoteBlocksById } from '@/app/lib/note/noteBlockTree';
import { prepareLoadedNoteBlocks } from '../_components/noteBulletInput';
import { useNoteBlockStore, selectDocumentBlocks } from '../_store/noteBlockStore';
import { noteBlocksLoadPath } from './noteBlocksLoad';
import { getReadyPrefetchedBlocks } from './noteDocumentBlocksPrefetch';
import { traceApiEgress } from './noteFlickerTrace';
import {
  rememberNoteDocumentBlocks,
} from './noteDocumentBlocksCache';
import {
  documentContentAheadOfSnapshot,
  mergeBlocksWithStoreContent,
} from './noteBlockStateMerge';
import { shouldKeepLocalOverEmptyServerAuthority } from './noteAuthority';
import { getStructuralExcludeIds } from './noteStructuralExcludeRegistry';
import { readLocalDocumentMemory } from './noteLocalDb';
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
  return {
    blocks: localBlocks,
    emptyConfirmed: false,
    toggleMigration,
  };
}

/**
 * 서버 스냅샷 1회 적용 — op-log: coordinator merge + reducer syncSnapshot 단일 dispatch.
 * 문서 open 시 store mutation은 이 함수(→ syncWithServer)만 수행한다.
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
 * 문서 전환 직후 UI 힌트만 반환 — store에 쓰지 않는다.
 * open 완료 전 선행 replaceBlocks가 좀비/깜빡임의 근본 원인이었음.
 */
export function prepareNoteDocumentOpenSync(
  documentId: string,
): { hasLocalHint: boolean } {
  const localMemory = readLocalDocumentMemory(documentId);
  return { hasLocalHint: (localMemory?.blocks.length ?? 0) > 0 };
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
 * fetch blocks/load → applyOpenServerSnapshot 1회 (coordinator IDB+outbound merge 포함)
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
