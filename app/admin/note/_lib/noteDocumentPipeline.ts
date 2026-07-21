'use client';

import type { NoteBlockOpRecord } from '@/app/lib/note/noteBlockOpTypes';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import type { NoteBlockFieldPatch } from './noteBlocksApi';
import type { NoteCommand } from './noteCommand';
import type { NoteBlockCommandResult } from './noteBlockCommands';
import { persistOpForBlockCommand } from './noteBlockCommandPersist';
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
  disposeNoteSyncCoordinatorInstance,
  getNoteSyncCoordinator,
  type NoteSyncCoordinator,
} from './noteSyncCoordinator';
import { newNoteBlockClientId } from './noteSyncGuards';
import { describeSnapshotDiff } from './noteSnapshotEquivalence';
import {
  traceSnapshotDecision,
  type SnapshotTraceOrigin,
} from './noteFlickerTrace';
import {
  applyNoteEmergencyDrafts,
  clearNoteEmergencyDrafts,
  saveNoteEmergencyDraft,
} from './noteEmergencyDrafts';

import { mergeBlocksWithStoreContent } from './noteBlockStateMerge';
import type { NoteBlock } from './types';

export type NoteDocumentPipelineCallbacks = {
  onError?: (error: Error) => void;
  triggerSave: () => void;
};

function buildCommandContext(
  documentId: string,
  coordinator: NoteSyncCoordinator | null,
) {
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
    pendingLeaveIds: getStructuralExcludeIds(documentId),
    hasUnpublishedTopology: coordinator?.hasUnpublishedTopologyAuthority() ?? false,
  };
}

function commitBlocksToStore(blocks: NoteBlock[], command: NoteCommand): void {
  const store = useNoteBlockStore.getState();
  if (command.type === 'hydrate' || command.type === 'replaceBlocks') {
    // 문서 open·전환 — 부모 문서 블록이 스토어에 남지 않게 전체 교체 (하위=상위 동일)
    store.replaceBlocks(blocks);
    return;
  }
  if (command.type === 'patchContent') {
    const block = blocks.find((item) => item.id === command.blockId);
    if (block?.content && typeof block.content === 'object') {
      store.patchContent(command.blockId, block.content as Record<string, unknown>);
    }
    return;
  }
  store.syncBlocksStructure(blocks);
}

export function dispatchNoteCommandToStore(
  documentId: string,
  command: NoteCommand,
  coordinator: NoteSyncCoordinator | null = null,
): NoteBlock[] {
  const store = useNoteBlockStore.getState();
  const previous = store.getBlocksArray();
  const ctx = buildCommandContext(documentId, coordinator);
  const { blocks } = applyNoteCommand(previous, command, ctx);
  if (
    command.type === 'replaceBlocks'
    || command.type === 'applyPatches'
  ) {
    markNoteLocalSave(documentId);
    coordinator?.markTopologyIntent();
  }
  commitBlocksToStore(blocks, command);
  return useNoteBlockStore.getState().getBlocksArray();
}

export function replaceNoteDocumentStoreView(
  documentId: string | null,
  blocks: NoteBlock[],
): void {
  const store = useNoteBlockStore.getState();
  store.setActiveDocumentId(documentId);
  store.replaceBlocks(blocks);
}

export function setActiveNoteDocumentStoreView(documentId: string | null): void {
  useNoteBlockStore.getState().setActiveDocumentId(documentId);
}

export function patchNoteBlockStoreContent(
  blockId: string,
  content: Record<string, unknown>,
): void {
  useNoteBlockStore.getState().patchContent(blockId, content);
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

  /** 구조는 coordinator/incoming, content만 store에서 병합 */
  private blocksWithStoreContent(blocks: NoteBlock[]): NoteBlock[] {
    return mergeBlocksWithStoreContent(blocks);
  }

  private dispatchSnapshotIfChanged(
    blocks: NoteBlock[],
    origin: SnapshotTraceOrigin,
    emptyConfirmed?: boolean,
  ): void {
    if (useNoteBlockStore.getState().activeDocumentId !== this.documentId) {
      return;
    }
    const blocksWithContent = this.blocksWithStoreContent(blocks);
    const current = useNoteBlockStore.getState().getBlocksArray();
    const reason = describeSnapshotDiff(current, blocksWithContent, this.documentId);
    if (reason === 'equivalent') {
      traceSnapshotDecision(origin, 'skip', reason, this.documentId);
      return;
    }
    traceSnapshotDecision(origin, 'dispatch', reason, this.documentId);
    this.dispatch({
      type: 'syncSnapshot',
      blocks: blocksWithContent,
      ...(emptyConfirmed ? { emptyConfirmed: true } : {}),
    });
  }

  private initQueue(): void {
    if (this.oplogEnabled) {
      this.coordinator = getNoteSyncCoordinator(this.documentId, {
        onBlocksUpdated: (_blocks, _lastSeq, origin) => {
          traceSnapshotDecision(origin, 'skip', 'equivalent', this.documentId);
        },
        onError: (error) => this.callbacks.onError?.(error),
      });
    }

    this.queue = new NoteDocumentOpQueue({
      getBlock: (blockId) => useNoteBlockStore.getState().getBlock(blockId),
      getDocumentBlocks: (documentId) => useNoteBlockStore.getState().getBlocksArray()
        .filter((block) => block.document_id === documentId),
      getActiveBlockId: () => useNoteBlockStore.getState().activeEditor?.blockId ?? null,
      triggerSave: () => this.callbacks.triggerSave(),
      onError: (error) => this.callbacks.onError?.(error),
      onContentPersisted: (blockIds) => clearNoteEmergencyDrafts(this.documentId, blockIds),
      persistViaOpLog: this.coordinator
        ? (op, options) => this.coordinator!.enqueuePersistOp(op, options)
        : undefined,
    });
  }

  updateCallbacks(callbacks: NoteDocumentPipelineCallbacks): void {
    this.callbacks = callbacks;
    if (this.coordinator) {
      this.coordinator.updateCallbacks({
        onBlocksUpdated: (_blocks, _lastSeq, origin) => {
          traceSnapshotDecision(origin, 'skip', 'equivalent', this.documentId);
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
    const next = dispatchNoteCommandToStore(this.documentId, command, this.coordinator);
    this.coordinator?.setBlocks(next);
    return next;
  }

  applyRemoteOps(ops: NoteBlockOpRecord[]): NoteBlock[] {
    void ops;
    return useNoteBlockStore.getState().getBlocksArray();
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
    // LocalApply = dispatch(patchContent) — store 직패치 금지
    this.dispatch({ type: 'patchContent', blockId, content: nextContent });
    markNoteLocalSave(this.documentId);
    this.queue?.scheduleContentPatch(blockId, nextContent, baseContent);
    this.syncPendingFlag();
    const next = useNoteBlockStore.getState().getBlocksArray();
    const forDoc = blocksForDocument(next, this.documentId);
    this.coordinator?.setBlocks(forDoc.length > 0 ? forDoc : next);
    saveNoteEmergencyDraft(this.documentId, blockId, nextContent);
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
    return null;
  }

  async syncWithServer(
    initialBlocks: NoteBlock[],
    options?: { skipDispatch?: boolean; emptyConfirmed?: boolean },
  ): Promise<void> {
    const coordinator = this.coordinator;
    if (!coordinator) {
      if (!options?.skipDispatch) {
        this.dispatch({
          type: 'hydrate',
          blocks: initialBlocks,
          ...(options?.emptyConfirmed ? { emptyConfirmed: true } : {}),
        });
      }
      return;
    }
    await coordinator.syncWithServer(initialBlocks);
    if (options?.skipDispatch) return;
    // 문서 전환 중 dispose되면 coordinator가 null — await 이후 재진입 금지
    if (this.disposed || this.coordinator !== coordinator) {
      return;
    }
    const storeForDoc = useNoteBlockStore.getState().getBlocksArray()
      .filter((block) => block.document_id === this.documentId);
    const blocks = this.applyEmergencyDrafts(this.blocksWithStoreContent(
      initialBlocks.filter((block) => block.document_id === this.documentId),
    ));
    if (storeForDoc.length === 0 || options?.emptyConfirmed) {
      const reason = describeSnapshotDiff(
        options?.emptyConfirmed ? storeForDoc : [],
        blocks,
        this.documentId,
      );
      if (reason !== 'equivalent') {
        traceSnapshotDecision('syncWithServer', 'dispatch', reason, this.documentId);
        this.dispatch({
          type: 'hydrate',
          blocks,
          ...(options?.emptyConfirmed ? { emptyConfirmed: true } : {}),
        });
      } else {
        traceSnapshotDecision('syncWithServer', 'skip', 'equivalent', this.documentId);
      }
      return;
    }
    this.dispatchSnapshotIfChanged(blocks, 'syncWithServer', options?.emptyConfirmed);
  }

  schedulePull(): void {
    traceSnapshotDecision('coordinator:pull', 'skip', 'equivalent', this.documentId);
  }

  async persistSoftDelete(args: SoftDeletePersistArgs): Promise<void> {
    await this.queue?.enqueue({ type: 'softDelete', ids: args.ids, blocks: args.blocks });
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
      allowEmptyVisibleCreate: args.allowEmptyVisibleCreate,
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
    deletedBlocks: NoteBlock[] = [],
  ): Promise<void> {
    if (!this.queue) {
      throw new Error('[Note] 문서 파이프라인이 준비되지 않았습니다');
    }
    await this.queue.enqueue({
      type: 'blockTransaction',
      patches,
      deleteIds,
      deletedBlocks,
    });
  }

  async applyStructureCommand(
    command: NoteBlockCommandResult,
    options?: { flush?: boolean },
  ): Promise<NoteBlock[]> {
    if (command.affectedIds.length === 0) {
      return useNoteBlockStore.getState().getBlocksArray();
    }
    const previous = useNoteBlockStore.getState().getBlocksArray();
    this.dispatch({ type: 'replaceBlocks', blocks: command.nextBlocks });
    try {
      const persistOp = persistOpForBlockCommand(command);
      if (persistOp?.type === 'blockTransaction') {
        await this.persistBlockTransaction(
          persistOp.patches,
          persistOp.deleteIds,
          persistOp.deletedBlocks,
        );
      }
      if (options?.flush !== false) {
        await this.flushPersistQueue();
      }
      return useNoteBlockStore.getState().getBlocksArray();
    } catch (error) {
      this.dispatch({ type: 'replaceBlocks', blocks: previous });
      throw error;
    }
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
    return [];
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

  hasUnpublishedTopologySync(): boolean {
    return this.coordinator?.hasUnpublishedTopologyAuthority() ?? false;
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

  private applyEmergencyDrafts(blocks: NoteBlock[]): NoteBlock[] {
    const { blocks: recoveredBlocks, recovered } = applyNoteEmergencyDrafts(this.documentId, blocks);
    for (const draft of recovered) {
      this.queue?.scheduleContentPatch(draft.blockId, draft.content);
    }
    if (recovered.length > 0) {
      this.syncPendingFlag();
      this.coordinator?.setBlocks(recoveredBlocks);
    }
    return recoveredBlocks;
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    const coordinator = this.coordinator;
    await this.queue?.drain().finally(async () => {
      await coordinator?.drain().finally(() => {
        if (this.oplogEnabled && coordinator) {
          disposeNoteSyncCoordinatorInstance(this.documentId, coordinator);
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

export async function disposeNoteDocumentPipeline(
  documentId: string,
  expected?: NoteDocumentPipeline,
): Promise<void> {
  const existing = pipelines.get(documentId);
  if (!existing) {
    // 맵에서 이미 제거된 뒤에도 expected dispose가 필요할 수 있음 (unmap-then-async)
    if (expected && !expected.isDisposed()) {
      await expected.dispose();
    }
    return;
  }
  // Strict Mode remount가 새 인스턴스를 맵에 올렸으면 옛 인스턴스만 dispose
  if (expected && existing !== expected) {
    if (!expected.isDisposed()) {
      await expected.dispose();
    }
    return;
  }
  pipelines.delete(documentId);
  await existing.dispose();
}

/** effect cleanup 직후 remount가 stale 인스턴스를 재사용하지 않게 맵에서 먼저 제거 */
export function unmapNoteDocumentPipeline(
  documentId: string,
  expected: NoteDocumentPipeline,
): void {
  if (pipelines.get(documentId) === expected) {
    pipelines.delete(documentId);
  }
}
