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
import { markNoteLocalSave, markPendingBlockDeletes } from './noteReconcileIdle';
import {
  getStructuralExcludeIds,
  removeStructuralExcludeIds,
  syncStructuralExcludeFromOutbound,
} from './noteStructuralExcludeRegistry';
import { listOutboundOps, putOutboundOps, removeOutboundOps } from './noteLocalDb';
import { planStripOutboundLeavesForRestoredIds } from './notePersistOpToBlockOps';
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
  clearNoteEmergencyDraft,
  clearNoteEmergencyDrafts,
  saveNoteEmergencyDraft,
} from './noteEmergencyDrafts';
import { noteContentHasProtectableUserPayload } from '@/app/lib/note/noteContentAuthority';

import { mergeBlocksWithStoreContent } from './noteBlockStateMerge';
import { resolveCreateBlockPersistOrders } from './noteCreatePersistOrders';
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

  private bindCoordinatorProjection(): void {
    if (!this.coordinator) return;
    this.coordinator.updateCallbacks({
      onBlocksUpdated: (blocks, _lastSeq, origin) => {
        if (this.disposed) return;
        this.dispatchSnapshotIfChanged(
          blocks.filter((block) => block.document_id === this.documentId),
          origin,
        );
        // Save Trust: debounce/deferred push가 나중에 비워졌을 때도 saved 가능
        if (origin === 'coordinator:push') {
          void this.coordinator?.hasPendingOutbound().then((pending) => {
            if (!pending && !this.disposed) this.callbacks.triggerSave();
          });
        }
      },
      onError: (error) => this.callbacks.onError?.(error),
    });
  }

  private initQueue(): void {
    if (this.oplogEnabled) {
      this.coordinator = getNoteSyncCoordinator(this.documentId, {
        onBlocksUpdated: () => {},
        onError: (error) => this.callbacks.onError?.(error),
      });
      this.bindCoordinatorProjection();
    }

    this.queue = new NoteDocumentOpQueue({
      getBlock: (blockId) => useNoteBlockStore.getState().getBlock(blockId),
      getDocumentBlocks: (documentId) => useNoteBlockStore.getState().getBlocksArray()
        .filter((block) => block.document_id === documentId),
      getActiveBlockId: () => useNoteBlockStore.getState().activeEditor?.blockId ?? null,
      triggerSave: () => this.callbacks.triggerSave(),
      onError: (error) => this.callbacks.onError?.(error),
      onContentPersisted: (blockIds) => clearNoteEmergencyDrafts(this.documentId, blockIds),
      onPreservePendingContent: (_documentId, blockId, content) => {
        saveNoteEmergencyDraft(this.documentId, blockId, content);
      },
      persistViaOpLog: this.coordinator
        ? (op, options) => this.coordinator!.enqueuePersistOp(op, options)
        : undefined,
    });
  }

  updateCallbacks(callbacks: NoteDocumentPipelineCallbacks): void {
    this.callbacks = callbacks;
    this.bindCoordinatorProjection();
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
    // 삭제 Intent 중인 id — TipTap late flush가 draft/본문을 되살리지 못하게 차단
    if (getStructuralExcludeIds(this.documentId).has(blockId)) {
      clearNoteEmergencyDraft(this.documentId, blockId);
      this.queue?.clearContentPatch(blockId);
      this.syncPendingFlag();
      return;
    }
    const storeBlock = useNoteBlockStore.getState().byId[blockId];
    const prevContent = (baseContent
      ?? (storeBlock?.content as Record<string, unknown> | null | undefined)
      ?? {}) as Record<string, unknown>;
    const nextContent = { ...prevContent, ...content };

    // leave/switch로 store에 없어도 보호 본문·체크는 pending+draft로 유지 (ZERO LOSS #5)
    if (!storeBlock || storeBlock.document_id !== this.documentId) {
      const protectable = noteContentHasProtectableUserPayload(nextContent)
        || noteContentHasProtectableUserPayload(prevContent);
      if (protectable) {
        this.queue?.scheduleContentPatch(blockId, nextContent, baseContent ?? prevContent);
        saveNoteEmergencyDraft(this.documentId, blockId, nextContent);
        this.syncPendingFlag();
      }
      return;
    }

    // LocalApply = dispatch(patchContent) — store 직패치 금지
    this.dispatch({ type: 'patchContent', blockId, content: nextContent });
    markNoteLocalSave(this.documentId);
    // base는 반드시 편집 전 스냅샷 — 서버가 동일길이 stale rewrite를 가려낼 수 있게
    this.queue?.scheduleContentPatch(blockId, nextContent, baseContent ?? prevContent);
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
    // IDB+outbound+exclude merge 결과 — raw initialBlocks로 덮어쓰지 않음
    const merged = coordinator.getBlocks()
      .filter((block) => block.document_id === this.documentId);
    const blocks = this.applyEmergencyDrafts(this.blocksWithStoreContent(merged));
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
    this.coordinator?.schedulePull();
  }

  async persistSoftDelete(args: SoftDeletePersistArgs): Promise<void> {
    clearNoteEmergencyDrafts(this.documentId, args.ids);
    markPendingBlockDeletes(this.documentId, args.ids);
    await this.queue?.enqueue({ type: 'softDelete', ids: args.ids, blocks: args.blocks });
  }

  async persistFieldPatches(patches: NoteBlockFieldPatch[]): Promise<void> {
    this.dispatch({ type: 'applyPatches', patches });
    await this.queue?.enqueue({ type: 'patchFields', patches });
  }

  async persistCreateBlock(args: CreateBlockPersistArgs): Promise<NoteBlock> {
    const id = args.id ?? newNoteBlockClientId();
    const parentId = args.parent_block_id;
    const fallbackInsertIndex = args.order_index ?? 0;
    const now = new Date().toISOString();
    const createdStub: NoteBlock = {
      id,
      document_id: args.documentId,
      parent_block_id: parentId,
      type: args.blockType,
      order_index: fallbackInsertIndex,
      content: args.content,
      created_at: now,
      updated_at: now,
      version: 1,
    };

    // C1: create order는 pipeline에서만 확정 — hook normalizeOrders는 힌트일 뿐
    const currentBlocks = blocksForDocument(
      useNoteBlockStore.getState().getBlocksArray(),
      args.documentId,
    );
    const persistOrders = resolveCreateBlockPersistOrders({
      blocks: currentBlocks,
      documentId: args.documentId,
      createdId: id,
      parentId,
      fallbackInsertIndex,
      createdBlock: createdStub,
    });
    if (persistOrders.repairedSiblings) {
      const repairedById = new Map(
        persistOrders.repairedSiblings.map((block) => [block.id, block]),
      );
      const allBlocks = useNoteBlockStore.getState().getBlocksArray();
      const next = allBlocks.map((block) => repairedById.get(block.id) ?? block);
      const missing = persistOrders.repairedSiblings.filter(
        (block) => !allBlocks.some((item) => item.id === block.id),
      );
      this.dispatch({
        type: 'replaceBlocks',
        blocks: missing.length > 0 ? [...next, ...missing] : next,
      });
    }

    const op = {
      type: 'createBlock' as const,
      id,
      documentId: args.documentId,
      blockType: args.blockType,
      content: args.content,
      order_index: persistOrders.order_index,
      parent_block_id: parentId,
      normalizeOrders: persistOrders.normalizeOrders,
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
    // 제품 삭제는 softDelete API가 아니라 blockTransaction(deleteIds)
    if (deleteIds.length > 0) {
      clearNoteEmergencyDrafts(this.documentId, deleteIds);
      for (const id of deleteIds) {
        this.queue.clearContentPatch(id);
      }
      this.syncPendingFlag();
    }
    await this.queue.enqueue({
      type: 'blockTransaction',
      patches,
      deleteIds,
      deletedBlocks,
    });
    // enqueue 성공 후에만 leave-exclude — persist 실패 롤백과 충돌 방지
    if (deleteIds.length > 0) {
      markPendingBlockDeletes(this.documentId, deleteIds);
    }
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
      const deleteIds = command.removedBlocks.map((block) => block.id);
      if (deleteIds.length > 0) {
        removeStructuralExcludeIds(this.documentId, deleteIds);
      }
      this.dispatch({ type: 'replaceBlocks', blocks: previous });
      throw error;
    }
  }

  /**
   * intentional restore — 미ack leave에서 해당 id만 strip (형제 leave·txn patch 보존).
   * trash restore · history restore-blocks reclaim 공통 choke.
   */
  async cancelPendingOutboundLeavesForBlockIds(blockIds: readonly string[]): Promise<void> {
    if (blockIds.length === 0) return;
    await this.flushPersistQueue();
    const outbound = await listOutboundOps(this.documentId);
    const plan = planStripOutboundLeavesForRestoredIds(outbound, new Set(blockIds));
    if (plan.removeClientOpIds.length === 0 && plan.rewriteOps.length === 0) return;
    if (plan.removeClientOpIds.length > 0) {
      await removeOutboundOps(plan.removeClientOpIds);
    }
    if (plan.rewriteOps.length > 0) {
      await putOutboundOps(plan.rewriteOps);
    }
    const remaining = await listOutboundOps(this.documentId);
    syncStructuralExcludeFromOutbound(this.documentId, remaining);
  }

  /**
   * paste 부분 실패 롤백 — LocalApply를 previous로 되돌리고 paste 구간 outbound만 제거.
   */
  async rollbackMutationToBlocks(
    previousBlocks: NoteBlock[],
    outboundClientOpIdsBefore: ReadonlySet<string>,
  ): Promise<void> {
    this.dispatch({ type: 'replaceBlocks', blocks: previousBlocks });
    const outbound = await listOutboundOps(this.documentId);
    const spawned = outbound
      .filter((op) => !outboundClientOpIdsBefore.has(op.clientOpId))
      .map((op) => op.clientOpId);
    if (spawned.length === 0) return;
    await removeOutboundOps(spawned);
    syncStructuralExcludeFromOutbound(
      this.documentId,
      await listOutboundOps(this.documentId),
    );
  }

  async listOutboundClientOpIds(): Promise<string[]> {
    const outbound = await listOutboundOps(this.documentId);
    return outbound.map((op) => op.clientOpId);
  }

  async persistRestoreBlock(blockId: string): Promise<NoteBlock[]> {
    if (!this.queue) {
      throw new Error('[Note] 문서 파이프라인이 준비되지 않았습니다');
    }
    // intentional restore: 미ack leave가 남아 있으면 HTTP 실패·재삭제·exclude 재투영
    await this.cancelPendingOutboundLeavesForBlockIds([blockId]);
    removeStructuralExcludeIds(this.documentId, [blockId]);
    const restored = await this.queue.enqueueRestoreBlock({ id: blockId });
    // trash/history restore는 leave-exclude grace까지 해제해야 재삭제되지 않는다
    removeStructuralExcludeIds(
      this.documentId,
      restored.map((block) => block.id),
    );
    return restored;
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
    const excluded = getStructuralExcludeIds(this.documentId);
    if (excluded.size > 0) {
      clearNoteEmergencyDrafts(this.documentId, excluded);
    }
    const eligible = excluded.size > 0
      ? blocks.filter((block) => !excluded.has(block.id))
      : blocks;
    const { blocks: recoveredBlocks, recovered } = applyNoteEmergencyDrafts(
      this.documentId,
      eligible,
    );
    // excluded 블록은 복구 대상에서 빠졌으므로 전체 목록에 다시 합친다
    const recoveredById = new Map(recoveredBlocks.map((block) => [block.id, block]));
    const merged = blocks.map((block) => recoveredById.get(block.id) ?? block);
    for (const draft of recovered) {
      if (excluded.has(draft.blockId)) continue;
      const existing = blocks.find((block) => block.id === draft.blockId);
      const baseContent = (existing?.content as Record<string, unknown> | null | undefined) ?? {};
      this.queue?.scheduleContentPatch(draft.blockId, draft.content, baseContent);
    }
    if (recovered.length > 0) {
      this.syncPendingFlag();
      this.coordinator?.setBlocks(merged);
    }
    return merged;
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
