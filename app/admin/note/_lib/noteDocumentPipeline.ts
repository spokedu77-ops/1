'use client';

import { devLogger } from '@/app/lib/logging/devLogger';
import type { NoteBlockOpRecord } from '@/app/lib/note/noteBlockOpTypes';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import type { NoteBlockFieldPatch } from './noteBlocksApi';
import type { NoteCommand } from './noteCommand';
import { applyNoteCommand } from './noteCommandReducer';
import {
  NoteDocumentOpQueue,
  type CreateBlockPersistArgs,
  type SoftDeletePersistArgs,
} from './noteDocumentOpQueue';
import { setNoteContentSavePending } from './notePendingSave';
import { markNoteLocalSave } from './noteReconcileIdle';
import { getStructuralExcludeIds } from './noteStructuralExcludeRegistry';
import { isNoteOplogSyncEnabled } from './noteOplogSync';
import {
  disposeNoteSyncCoordinator,
  getNoteSyncCoordinator,
  type NoteSyncCoordinator,
} from './noteSyncCoordinator';
import { newNoteBlockClientId } from './noteSyncGuards';
import { describeSnapshotDiff } from './noteSnapshotEquivalence';
import {
  traceSnapshotDecision,
  type SnapshotTraceOrigin,
} from './noteFlickerTrace';
import { rememberNoteDocumentBlocks } from './noteDocumentBlocksCache';
import { mergeBlocksWithStoreContent } from './noteBlockStateMerge';
import type { NoteBlock } from './types';

const CONTENT_DEBOUNCE_MS = 1500;

export type NoteDocumentPipelineCallbacks = {
  onError?: (error: Error) => void;
  triggerSave: () => void;
};

function buildCommandContext(documentId: string) {
  const store = useNoteBlockStore.getState();
  const storeContentById: Record<string, Record<string, unknown> | undefined> = {};
  for (const [id, block] of Object.entries(store.byId)) {
    if (block?.content && typeof block.content === 'object') {
      storeContentById[id] = block.content as Record<string, unknown>;
    }
  }
  return {
    documentId,
    activeBlockId: store.activeEditor?.blockId ?? null,
    storeContentById,
  };
}

function commitBlocksToStore(blocks: NoteBlock[], command: NoteCommand): void {
  const store = useNoteBlockStore.getState();
  if (command.type === 'hydrate' || command.type === 'replaceBlocks') {
    // 문서 open·전환 — 부모 문서 블록이 스토어에 남지 않게 전체 교체 (하위=상위 동일)
    store.replaceBlocks(blocks);
    return;
  }
  store.syncBlocksStructure(blocks);
}

function blocksForDocument(blocks: NoteBlock[], documentId: string): NoteBlock[] {
  return blocks.filter((block) => block.document_id === documentId);
}

/**
 * 문서 블록의 단일 파이프라인.
 * - 상태 전이: dispatch(NoteCommand) → reducer → Zustand
 * - 영속화: OpQueue + SyncCoordinator (op-log only)
 */
export class NoteDocumentPipeline {
  private queue: NoteDocumentOpQueue | null = null;

  private coordinator: NoteSyncCoordinator | null = null;

  private disposed = false;

  constructor(
    private readonly documentId: string,
    private callbacks: NoteDocumentPipelineCallbacks,
    private readonly oplogEnabled = isNoteOplogSyncEnabled(),
  ) {
    this.initQueue();
  }

  private dispatchSnapshotIfChanged(blocks: NoteBlock[], origin: SnapshotTraceOrigin): void {
    if (useNoteBlockStore.getState().activeDocumentId !== this.documentId) {
      return;
    }
    const storeForDoc = useNoteBlockStore.getState().getBlocksArray()
      .filter((block) => block.document_id === this.documentId);
    if (storeForDoc.length > 0) {
      const mergedStore = mergeBlocksWithStoreContent(storeForDoc);
      this.coordinator?.setBlocks(mergedStore);
      blocks = mergedStore;
    }
    const current = useNoteBlockStore.getState().getBlocksArray();
    const reason = describeSnapshotDiff(current, blocks, this.documentId);
    if (reason === 'equivalent') {
      traceSnapshotDecision(origin, 'skip', reason, this.documentId);
      return;
    }
    traceSnapshotDecision(origin, 'dispatch', reason, this.documentId);
    this.dispatch({ type: 'syncSnapshot', blocks });
  }

  private initQueue(): void {
    if (this.oplogEnabled) {
      this.coordinator = getNoteSyncCoordinator(this.documentId, {
        onBlocksUpdated: (blocks, _lastSeq, origin) => {
          this.dispatchSnapshotIfChanged(blocks, origin);
        },
        onError: (error) => this.callbacks.onError?.(error),
      });
    }

    this.queue = new NoteDocumentOpQueue({
      getBlock: (blockId) => useNoteBlockStore.getState().getBlock(blockId),
      getActiveBlockId: () => useNoteBlockStore.getState().activeEditor?.blockId ?? null,
      triggerSave: () => this.callbacks.triggerSave(),
      onError: (error) => this.callbacks.onError?.(error),
      persistViaOpLog: this.coordinator
        ? (op, options) => this.coordinator!.enqueuePersistOp(op, options)
        : undefined,
    });
  }

  updateCallbacks(callbacks: NoteDocumentPipelineCallbacks): void {
    this.callbacks = callbacks;
    if (this.coordinator) {
      this.coordinator.updateCallbacks({
        onBlocksUpdated: (blocks, _lastSeq, origin) => {
          this.dispatchSnapshotIfChanged(blocks, origin);
        },
        onError: (error) => callbacks.onError?.(error),
      });
    }
  }

  /** 모든 로컬·remote 블록 상태 변경의 유일한 입구 */
  dispatch(command: NoteCommand): NoteBlock[] {
    if (
      useNoteBlockStore.getState().activeDocumentId !== this.documentId
      && command.type !== 'replaceBlocks'
      && command.type !== 'hydrate'
    ) {
      return useNoteBlockStore.getState().getBlocksArray();
    }
    const store = useNoteBlockStore.getState();
    const previous = store.getBlocksArray();
    const ctx = buildCommandContext(this.documentId);
    let { blocks } = applyNoteCommand(previous, command, ctx);
    // soft delete outbound 적재 전에 patchFields/reconcile이 블록을 되살리지 않게
    const pendingDeletes = getStructuralExcludeIds(this.documentId);
    if (pendingDeletes.size > 0) {
      blocks = blocks.filter((block) => !pendingDeletes.has(block.id));
    }
    commitBlocksToStore(blocks, command);
    const next = useNoteBlockStore.getState().getBlocksArray();
    this.coordinator?.setBlocks(next);
    return next;
  }

  applyRemoteOps(ops: NoteBlockOpRecord[]): NoteBlock[] {
    if (ops.length === 0) return useNoteBlockStore.getState().getBlocksArray();
    return this.dispatch({ type: 'applyRemoteOps', ops });
  }

  scheduleContentPatch(
    blockId: string,
    content: Record<string, unknown>,
    baseContent?: Record<string, unknown>,
  ): void {
    const storeBlock = useNoteBlockStore.getState().byId[blockId];
    const prevContent = (baseContent
      ?? (storeBlock?.content as Record<string, unknown> | null | undefined)
      ?? {}) as Record<string, unknown>;
    const nextContent = { ...prevContent, ...content };
    useNoteBlockStore.getState().patchContent(blockId, nextContent);
    markNoteLocalSave(this.documentId);
    this.queue?.scheduleContentPatch(blockId, nextContent, baseContent);
    this.syncPendingFlag();
    const next = useNoteBlockStore.getState().getBlocksArray();
    const forDoc = blocksForDocument(next, this.documentId);
    this.coordinator?.setBlocks(forDoc.length > 0 ? forDoc : next);
    rememberNoteDocumentBlocks(
      this.documentId,
      mergeBlocksWithStoreContent(forDoc.length > 0 ? forDoc : next),
    );
  }

  clearContentPatch(blockId: string): void {
    this.queue?.clearContentPatch(blockId);
    this.syncPendingFlag();
  }

  async flushContentPatches(): Promise<void> {
    await this.queue?.flushContentPatches();
    this.syncPendingFlag();
  }

  async flushPersistQueue(): Promise<void> {
    await this.queue?.drain();
    await this.coordinator?.drain();
    this.syncPendingFlag();
  }

  async hydrateFromLocal(): Promise<NoteBlock[] | null> {
    if (!this.coordinator) return null;
    const blocks = await this.coordinator.hydrateFromLocal();
    if (!blocks || blocks.length === 0) return null;
    return this.dispatch({ type: 'hydrate', blocks });
  }

  async syncWithServer(
    initialBlocks: NoteBlock[],
    options?: { skipDispatch?: boolean },
  ): Promise<void> {
    if (!this.coordinator) {
      if (!options?.skipDispatch) {
        this.dispatch({ type: 'hydrate', blocks: initialBlocks });
      }
      return;
    }
    await this.coordinator.syncWithServer(initialBlocks);
    if (options?.skipDispatch) return;
    const storeForDoc = useNoteBlockStore.getState().getBlocksArray()
      .filter((block) => block.document_id === this.documentId);
    if (storeForDoc.length > 0) {
      this.coordinator.setBlocks(mergeBlocksWithStoreContent(storeForDoc));
    }
    const blocks = this.coordinator.getBlocks();
    if (storeForDoc.length === 0) {
      const reason = describeSnapshotDiff([], blocks, this.documentId);
      if (reason !== 'equivalent') {
        traceSnapshotDecision('syncWithServer', 'dispatch', reason, this.documentId);
        this.dispatch({ type: 'hydrate', blocks });
      } else {
        traceSnapshotDecision('syncWithServer', 'skip', 'equivalent', this.documentId);
      }
      return;
    }
    this.dispatchSnapshotIfChanged(blocks, 'syncWithServer');
  }

  schedulePull(): void {
    this.coordinator?.schedulePull();
  }

  async persistSoftDelete(args: SoftDeletePersistArgs): Promise<void> {
    await this.queue?.enqueue({ type: 'softDelete', ids: args.ids });
  }

  async persistFieldPatches(patches: NoteBlockFieldPatch[]): Promise<void> {
    this.dispatch({ type: 'applyPatches', patches });
    await this.queue?.enqueue({ type: 'patchFields', patches });
  }

  async persistCreateBlock(args: CreateBlockPersistArgs): Promise<NoteBlock> {
    const id = args.id ?? newNoteBlockClientId();
    const op = {
      type: 'createBlock' as const,
      id,
      documentId: args.documentId,
      blockType: args.blockType,
      content: args.content,
      order_index: args.order_index,
      parent_block_id: args.parent_block_id,
      normalizeOrders: args.normalizeOrders,
      transactionUpdates: args.transactionUpdates,
    };
    for (let attempt = 0; attempt < 40; attempt += 1) {
      if (this.disposed) {
        throw new Error('문서 파이프라인이 준비되지 않았습니다');
      }
      if (this.queue) {
        return this.queue.enqueueCreateBlock(op);
      }
      await new Promise((resolve) => {
        setTimeout(resolve, 16);
      });
    }
    throw new Error('문서 파이프라인이 준비되지 않았습니다');
  }

  async persistBlockTransaction(
    patches: NoteBlockFieldPatch[],
    deleteIds: string[] = [],
  ): Promise<void> {
    await this.queue?.enqueue({ type: 'blockTransaction', patches, deleteIds });
  }

  async persistRestoreBlock(blockId: string): Promise<NoteBlock[]> {
    if (!this.queue) {
      throw new Error('[Note] 문서 파이프라인이 준비되지 않았습니다');
    }
    return this.queue.enqueueRestoreBlock({ id: blockId });
  }

  async persistPurgeBlock(blockId: string): Promise<void> {
    if (!this.queue) {
      throw new Error('[Note] 문서 파이프라인이 준비되지 않았습니다');
    }
    await this.queue.enqueue({ type: 'purgeBlock', id: blockId });
  }

  getBlocks(): NoteBlock[] {
    return useNoteBlockStore.getState().getBlocksArray();
  }

  getCoordinatorBlocks(): NoteBlock[] {
    return this.coordinator?.getBlocks() ?? [];
  }

  hasPendingContent(): boolean {
    return this.queue?.hasPendingContent ?? false;
  }

  hasPendingPersist(): boolean {
    return this.queue?.hasPendingPersist() ?? false;
  }

  async hasPendingOutbound(): Promise<boolean> {
    return this.coordinator?.hasPendingOutbound() ?? false;
  }

  isOplogEnabled(): boolean {
    return this.oplogEnabled;
  }

  isDisposed(): boolean {
    return this.disposed;
  }

  private syncPendingFlag(): void {
    setNoteContentSavePending(this.queue?.hasPendingContent ?? false);
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    const coordinator = this.coordinator;
    await this.queue?.drain().finally(async () => {
      await coordinator?.drain().finally(() => {
        if (this.oplogEnabled) {
          disposeNoteSyncCoordinator(this.documentId);
        }
      });
    });
    this.queue?.dispose();
    this.queue = null;
    this.coordinator = null;
    setNoteContentSavePending(false);
  }
}

const pipelines = new Map<string, NoteDocumentPipeline>();

export function getNoteDocumentPipeline(
  documentId: string,
  callbacks: NoteDocumentPipelineCallbacks,
): NoteDocumentPipeline {
  const existing = pipelines.get(documentId);
  if (existing) {
    if (existing.isDisposed()) {
      pipelines.delete(documentId);
    } else {
      existing.updateCallbacks(callbacks);
      return existing;
    }
  }
  const pipeline = new NoteDocumentPipeline(documentId, callbacks);
  pipelines.set(documentId, pipeline);
  return pipeline;
}

export async function disposeNoteDocumentPipeline(documentId: string): Promise<void> {
  const existing = pipelines.get(documentId);
  if (!existing) return;
  pipelines.delete(documentId);
  await existing.dispose();
}
