'use client';

import { devLogger } from '@/app/lib/logging/devLogger';
import type { NoteBlockOpRecord } from '@/app/lib/note/noteBlockOpTypes';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import type { NoteBlockFieldPatch } from './noteBlocksApi';
import { purgeNoteBlockFromTrash, restoreNoteBlockFromTrash } from './noteBlocksApi';
import type { NoteCommand } from './noteCommand';
import { applyNoteCommand } from './noteCommandReducer';
import { applyServerBlockVersions } from './noteDocumentEngine';
import {
  NoteDocumentOpQueue,
  type CreateBlockPersistArgs,
  type SoftDeletePersistArgs,
} from './noteDocumentOpQueue';
import { setNoteContentSavePending } from './notePendingSave';
import { contentChangeNeedsReactBlocks } from './noteContentPatch';
import { markNoteLocalSave } from './noteReconcileIdle';
import { broadcastNoteBlockVersions } from './noteCrossTabBlockSync';
import { isNoteOplogSyncEnabled } from './noteOplogSync';
import {
  disposeNoteSyncCoordinator,
  getNoteSyncCoordinator,
  type NoteSyncCoordinator,
} from './noteSyncCoordinator';
import { newNoteBlockClientId } from './noteSyncGuards';
import type { NoteBlock } from './types';

const CONTENT_DEBOUNCE_MS = 1500;

export type NoteDocumentPipelineCallbacks = {
  onBlocksChanged: (blocks: NoteBlock[]) => void;
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

function commitBlocksToStore(blocks: NoteBlock[], structural: boolean): void {
  const store = useNoteBlockStore.getState();
  if (structural) {
    store.syncBlocksStructure(blocks);
  } else {
    // patchContent는 reducer 결과 전체를 structure sync — content는 store 우선 규칙 적용됨
    store.syncBlocksStructure(blocks);
  }
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

  private initQueue(): void {
    if (this.oplogEnabled) {
      this.coordinator = getNoteSyncCoordinator(this.documentId, {
        onBlocksUpdated: (blocks) => {
          this.dispatch({ type: 'syncSnapshot', blocks });
        },
        onError: (error) => this.callbacks.onError?.(error),
      });
    }

    this.queue = new NoteDocumentOpQueue({
      getBlock: (blockId) => useNoteBlockStore.getState().getBlock(blockId),
      getActiveBlockId: () => useNoteBlockStore.getState().activeEditor?.blockId ?? null,
      triggerSave: () => this.callbacks.triggerSave(),
      onError: (error) => this.callbacks.onError?.(error),
      onServerPatches: (patched) => {
        if (this.oplogEnabled) return;
        markNoteLocalSave(this.documentId);
        const next = applyServerBlockVersions(
          useNoteBlockStore.getState().getBlocksArray(),
          patched,
        );
        this.dispatch({ type: 'replaceBlocks', blocks: next });
        broadcastNoteBlockVersions(this.documentId, patched);
      },
      onServerConflicts: (conflicts) => {
        if (this.oplogEnabled) return;
        this.dispatch({ type: 'syncSnapshot', blocks: conflicts });
        broadcastNoteBlockVersions(
          this.documentId,
          conflicts.map((block) => ({
            id: block.id,
            version: block.version,
            updated_at: block.updated_at,
          })),
        );
      },
      persistViaOpLog: this.coordinator
        ? (op, options) => this.coordinator!.enqueuePersistOp(op, options)
        : undefined,
    });
  }

  updateCallbacks(callbacks: NoteDocumentPipelineCallbacks): void {
    this.callbacks = callbacks;
    if (this.coordinator) {
      this.coordinator.updateCallbacks({
        onBlocksUpdated: (blocks) => {
          this.dispatch({ type: 'syncSnapshot', blocks });
        },
        onError: (error) => callbacks.onError?.(error),
      });
    }
  }

  /** 모든 로컬·remote 블록 상태 변경의 유일한 입구 */
  dispatch(command: NoteCommand): NoteBlock[] {
    const store = useNoteBlockStore.getState();
    const previous = store.getBlocksArray();
    const ctx = buildCommandContext(this.documentId);
    const { blocks, structural } = applyNoteCommand(previous, command, ctx);
    commitBlocksToStore(blocks, structural);
    const next = useNoteBlockStore.getState().getBlocksArray();
    this.coordinator?.setBlocks(next);
    this.callbacks.onBlocksChanged(next);
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
    useNoteBlockStore.getState().patchContent(blockId, content);
    this.queue?.scheduleContentPatch(blockId, content, baseContent);
    this.syncPendingFlag();
    if (contentChangeNeedsReactBlocks(prevContent, nextContent)) {
      this.callbacks.onBlocksChanged(useNoteBlockStore.getState().getBlocksArray());
    }
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
    if (!blocks) return null;
    return this.dispatch({ type: 'hydrate', blocks });
  }

  async syncWithServer(initialBlocks: NoteBlock[]): Promise<void> {
    if (!this.coordinator) {
      this.dispatch({ type: 'hydrate', blocks: initialBlocks });
      return;
    }
    await this.coordinator.syncWithServer(initialBlocks);
    const blocks = this.coordinator.getBlocks();
    if (blocks.length > 0) {
      this.dispatch({ type: 'syncSnapshot', blocks });
    } else {
      this.dispatch({ type: 'hydrate', blocks: initialBlocks });
    }
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
    if (!this.queue) {
      throw new Error('문서 파이프라인이 준비되지 않았습니다');
    }
    return this.queue.enqueueCreateBlock(op);
  }

  async persistBlockTransaction(
    patches: NoteBlockFieldPatch[],
    deleteIds: string[] = [],
  ): Promise<void> {
    await this.queue?.enqueue({ type: 'blockTransaction', patches, deleteIds });
  }

  async persistRestoreBlock(blockId: string): Promise<NoteBlock[]> {
    if (this.queue) {
      return this.queue.enqueueRestoreBlock({ id: blockId });
    }
    const blocks = await restoreNoteBlockFromTrash(blockId);
    this.callbacks.triggerSave();
    return blocks;
  }

  async persistPurgeBlock(blockId: string): Promise<void> {
    if (this.queue) {
      await this.queue.enqueue({ type: 'purgeBlock', id: blockId });
      return;
    }
    await purgeNoteBlockFromTrash(blockId);
    this.callbacks.triggerSave();
  }

  getBlocks(): NoteBlock[] {
    return useNoteBlockStore.getState().getBlocksArray();
  }

  hasPendingContent(): boolean {
    return this.queue?.hasPendingContent ?? false;
  }

  hasPendingPersist(): boolean {
    return this.queue?.hasPendingPersist() ?? false;
  }

  isOplogEnabled(): boolean {
    return this.oplogEnabled;
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
    existing.updateCallbacks(callbacks);
    return existing;
  }
  const pipeline = new NoteDocumentPipeline(documentId, callbacks);
  pipelines.set(documentId, pipeline);
  return pipeline;
}

export async function disposeNoteDocumentPipeline(documentId: string): Promise<void> {
  const existing = pipelines.get(documentId);
  if (!existing) return;
  await existing.dispose();
  pipelines.delete(documentId);
}
