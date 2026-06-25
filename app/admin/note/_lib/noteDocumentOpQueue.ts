import { devLogger } from '@/app/lib/logging/devLogger';
import {
  NoteBlockVersionConflictError,
  patchNoteBlocksResolvingConflicts,
  postNoteBlockTransaction,
  postNoteBlockCreateTransaction,
  postNoteBlock,
  putNoteBlockOrders,
  purgeNoteBlockFromTrash,
  restoreNoteBlockFromTrash,
  type PatchedNoteBlock,
} from './noteBlocksApi';
import type { NoteBlockFieldPatch } from './noteBlocksApi';
import type { NotePersistOp } from './noteDocumentOps';
import type { NoteBlock } from './types';

const CONTENT_DEBOUNCE_MS = 600;

export type NoteDocumentOpQueueDeps = {
  getBlock: (blockId: string) => NoteBlock | undefined;
  getActiveBlockId: () => string | null;
  triggerSave: () => void;
  onError?: (error: Error) => void;
  onServerPatches?: (blocks: PatchedNoteBlock[]) => void;
  onServerConflicts?: (blocks: NoteBlock[]) => void;
};

function contentRecordsEqual(
  left: Record<string, unknown> | undefined,
  right: Record<string, unknown> | undefined,
): boolean {
  return JSON.stringify(left ?? {}) === JSON.stringify(right ?? {});
}

/** 서버 반영 큐 — 연산을 순차 실행해 race를 줄인다 */
export class NoteDocumentOpQueue {
  private serial: Promise<void> = Promise.resolve();

  private contentTimers = new Map<string, ReturnType<typeof setTimeout>>();

  private pendingContent = new Map<string, Record<string, unknown>>();

  private contentFlushPending = false;

  private persistInFlight = false;

  constructor(private readonly deps: NoteDocumentOpQueueDeps) {}

  get hasPendingContent(): boolean {
    return this.contentFlushPending || this.pendingContent.size > 0;
  }

  hasPendingPersist(): boolean {
    return this.persistInFlight || this.hasPendingContent;
  }

  async drain(): Promise<void> {
    await this.flushContentPatches();
    await this.serial;
  }

  scheduleContentPatch(blockId: string, content: Record<string, unknown>): void {
    this.pendingContent.set(blockId, content);
    this.contentFlushPending = true;
    const prev = this.contentTimers.get(blockId);
    if (prev) clearTimeout(prev);
    const timer = setTimeout(() => {
      this.contentTimers.delete(blockId);
      void this.flushContentPatches();
    }, CONTENT_DEBOUNCE_MS);
    this.contentTimers.set(blockId, timer);
  }

  clearContentPatch(blockId: string): void {
    this.pendingContent.delete(blockId);
    const timer = this.contentTimers.get(blockId);
    if (timer) {
      clearTimeout(timer);
      this.contentTimers.delete(blockId);
    }
    if (this.pendingContent.size === 0) {
      this.contentFlushPending = false;
    }
  }

  async flushContentPatches(): Promise<void> {
    for (const timer of this.contentTimers.values()) {
      clearTimeout(timer);
    }
    this.contentTimers.clear();

    if (this.pendingContent.size === 0) {
      this.contentFlushPending = false;
      return;
    }

    const snapshot = new Map(this.pendingContent);
    this.pendingContent.clear();
    this.contentFlushPending = false;

    const updates = [...snapshot.entries()].map(([id, content]) => {
      return { id, content };
    });

    await this.enqueue({ type: 'patchContent', updates });
  }

  enqueue(op: NotePersistOp): Promise<void> {
    const operation = this.serial.then(() => this.runPersistOp(op));
    this.serial = operation.catch((error: unknown) => {
        if (error instanceof NoteBlockVersionConflictError) return;
        const err = error instanceof Error ? error : new Error(String(error));
        this.deps.onError?.(err);
        devLogger.error('[Note] document op queue', err);
      });
    return operation;
  }

  /** 블록 생성 — 순차 큐를 거치며 생성된 블록을 반환한다 */
  enqueueCreateBlock(
    op: Extract<NotePersistOp, { type: 'createBlock' }>,
  ): Promise<NoteBlock> {
    let resolve!: (block: NoteBlock) => void;
    let reject!: (error: Error) => void;
    const result = new Promise<NoteBlock>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    this.serial = this.serial
      .then(async () => {
        this.persistInFlight = true;
        try {
          const block = await this.runCreateBlock(op);
          resolve(block);
        } catch (error: unknown) {
          const err = error instanceof Error ? error : new Error(String(error));
          reject(err);
          if (!(error instanceof NoteBlockVersionConflictError)) {
            this.deps.onError?.(err);
            devLogger.error('[Note] document op queue createBlock', err);
          }
          throw err;
        } finally {
          this.persistInFlight = false;
        }
      })
      .catch((error: unknown) => {
        if (error instanceof NoteBlockVersionConflictError) return;
      });

    return result;
  }

  enqueueRestoreBlock(op: { id: string }): Promise<NoteBlock[]> {
    let resolve!: (blocks: NoteBlock[]) => void;
    let reject!: (error: Error) => void;
    const result = new Promise<NoteBlock[]>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    this.serial = this.serial
      .then(async () => {
        this.persistInFlight = true;
        try {
          const blocks = await restoreNoteBlockFromTrash(op.id);
          this.deps.triggerSave();
          resolve(blocks);
        } catch (error: unknown) {
          const err = error instanceof Error ? error : new Error(String(error));
          reject(err);
          if (!(error instanceof NoteBlockVersionConflictError)) {
            this.deps.onError?.(err);
            devLogger.error('[Note] document op queue restoreBlock', err);
          }
          throw err;
        } finally {
          this.persistInFlight = false;
        }
      })
      .catch((error: unknown) => {
        if (error instanceof NoteBlockVersionConflictError) return;
      });

    return result;
  }

  private async runCreateBlock(
    op: Extract<NotePersistOp, { type: 'createBlock' }>,
  ): Promise<NoteBlock> {
    if (op.normalizeOrders !== undefined) {
      const result = await postNoteBlockCreateTransaction(
        {
          documentId: op.documentId,
          blockType: op.blockType,
          content: op.content,
          order_index: op.order_index,
          parent_block_id: op.parent_block_id,
        },
        op.normalizeOrders,
        (id) => this.deps.getBlock(id),
      );
      if (result.patchedBlocks.length > 0) {
        this.deps.onServerPatches?.(result.patchedBlocks);
      }
      this.deps.triggerSave();
      return result.createdBlock;
    }

    const block = await postNoteBlock({
      documentId: op.documentId,
      blockType: op.blockType,
      content: op.content,
      order_index: op.order_index,
      parent_block_id: op.parent_block_id,
    });

    this.deps.triggerSave();
    return block;
  }

  private async patchWithVersionRetry(
    patches: NoteBlockFieldPatch[],
  ): Promise<void> {
    const patched = await patchNoteBlocksResolvingConflicts(
      patches,
      (id) => this.deps.getBlock(id),
    );
    if (patched.length > 0) {
      this.deps.onServerPatches?.(patched);
    }
    this.deps.triggerSave();
  }

  private async handleContentConflict(
    op: Extract<NotePersistOp, { type: 'patchContent' }>,
    conflicts: PatchedNoteBlock[],
  ): Promise<void> {
    this.deps.onServerConflicts?.(conflicts as NoteBlock[]);

    const retries: NoteBlockFieldPatch[] = [];
    for (const update of op.updates) {
      const local = this.deps.getBlock(update.id);
      const server = conflicts.find((block) => block.id === update.id);
      if (!local || !server) continue;

      const localContent = (local.content ?? {}) as Record<string, unknown>;
      const sentContent = update.content;
      if (contentRecordsEqual(localContent, sentContent)) continue;
      if (contentRecordsEqual(localContent, (server.content ?? {}) as Record<string, unknown>)) {
        continue;
      }

      retries.push({
        id: update.id,
        content: localContent,
        expected_version: server.version,
      });
    }

    if (retries.length === 0) return;
    await this.patchWithVersionRetry(retries);
  }

  private async runPersistOp(op: NotePersistOp): Promise<void> {
    this.persistInFlight = true;
    try {
      switch (op.type) {
      case 'patchContent': {
        if (op.updates.length === 0) return;
        const patches = op.updates.map((update) => ({
          id: update.id,
          content: update.content,
        }));
        try {
          await this.patchWithVersionRetry(patches);
        } catch (error) {
          if (error instanceof NoteBlockVersionConflictError) {
            await this.handleContentConflict(op, error.conflicts);
            return;
          }
          throw error;
        }
        return;
      }
      case 'patchFields': {
        if (op.patches.length === 0) return;
        try {
          const patched = await postNoteBlockTransaction(
            op.patches,
            [],
            (id) => this.deps.getBlock(id),
          );
          if (patched.length > 0) this.deps.onServerPatches?.(patched);
          this.deps.triggerSave();
        } catch (error) {
          if (error instanceof NoteBlockVersionConflictError) {
            this.deps.onServerConflicts?.(error.conflicts as NoteBlock[]);
            this.deps.onError?.(new Error('다른 탭에서 블록이 수정되어 저장하지 못했습니다.'));
            return;
          }
          throw error;
        }
        return;
      }
      case 'reorderBlocks': {
        try {
          const patched = await putNoteBlockOrders(
            op.orders,
            op.fieldPatches,
            (id) => this.deps.getBlock(id),
          );
          if (patched.length > 0) {
            this.deps.onServerPatches?.(patched);
          }
          this.deps.triggerSave();
        } catch (error) {
          if (error instanceof NoteBlockVersionConflictError) {
            this.deps.onServerConflicts?.(error.conflicts as NoteBlock[]);
            this.deps.onError?.(new Error('블록 이동 저장 중 버전 충돌이 발생했습니다.'));
            return;
          }
          throw error;
        }
        return;
      }
      case 'transferBlocks': {
        if (op.patches.length === 0) return;
        try {
          await this.patchWithVersionRetry(op.patches);
        } catch (error) {
          if (error instanceof NoteBlockVersionConflictError) {
            this.deps.onServerConflicts?.(error.conflicts as NoteBlock[]);
            this.deps.onError?.(new Error('블록 문서 이동 저장 중 버전 충돌이 발생했습니다.'));
            return;
          }
          throw error;
        }
        return;
      }
      case 'blockTransaction': {
        const patched = await postNoteBlockTransaction(
          op.patches,
          op.deleteIds,
          (id) => this.deps.getBlock(id),
        );
        if (patched.length > 0) this.deps.onServerPatches?.(patched);
        this.deps.triggerSave();
        return;
      }
      case 'softDelete': {
        if (op.ids.length === 0) return;
        const res = await fetch('/api/admin/note/blocks', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ ids: op.ids }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error((j as { error?: string } | null)?.error || '삭제 실패');
        }
        this.deps.triggerSave();
        return;
      }
      case 'purgeBlock': {
        await purgeNoteBlockFromTrash(op.id);
        this.deps.triggerSave();
        return;
      }
      case 'createBlock': {
        await this.runCreateBlock(op);
        return;
      }
      default: {
        const _exhaustive: never = op;
        return _exhaustive;
      }
      }
    } finally {
      this.persistInFlight = false;
    }
  }

  dispose(): void {
    for (const timer of this.contentTimers.values()) {
      clearTimeout(timer);
    }
    this.contentTimers.clear();
    this.pendingContent.clear();
    this.contentFlushPending = false;
  }
}

export type SoftDeletePersistArgs = {
  ids: string[];
};

export type ReorderPersistArgs = {
  orders: Array<{ id: string; order_index: number }>;
  fieldPatches?: NoteBlockFieldPatch[];
};

export type CreateBlockPersistArgs = {
  documentId: string;
  blockType: NoteBlock['type'];
  content: Record<string, unknown>;
  order_index?: number;
  parent_block_id: string | null;
  normalizeOrders?: Array<{ id: string; order_index: number }>;
};
