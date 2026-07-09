import { devLogger } from '@/app/lib/logging/devLogger';
import {
  NoteBlockVersionConflictError,
  patchNoteBlocksResolvingConflicts,
  postNoteBlockTransaction,
  postNoteBlockCreateTransaction,
  postNoteBlock,
  purgeNoteBlockFromTrash,
  restoreNoteBlockFromTrash,
  type PatchedNoteBlock,
} from './noteBlocksApi';
import type { NoteBlockFieldPatch } from './noteBlocksApi';
import { newNoteBlockClientId } from './noteSyncGuards';
import type { NotePersistOp } from './noteDocumentOps';
import type { NoteBlock } from './types';

const CONTENT_DEBOUNCE_MS = 1500;

export type NoteDocumentOpQueueDeps = {
  getBlock: (blockId: string) => NoteBlock | undefined;
  getActiveBlockId: () => string | null;
  triggerSave: () => void;
  onError?: (error: Error) => void;
  onServerPatches?: (blocks: PatchedNoteBlock[]) => void;
  onServerConflicts?: (blocks: NoteBlock[]) => void;
  /** op-log sync 활성 시 HTTP persist 대신 coordinator에 위임 */
  persistViaOpLog?: (
    op: NotePersistOp,
    options?: { immediate?: boolean },
  ) => Promise<void>;
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

  private pendingContent = new Map<string, {
    content: Record<string, unknown>;
    baseContent?: Record<string, unknown>;
  }>();

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

  scheduleContentPatch(
    blockId: string,
    content: Record<string, unknown>,
    baseContent?: Record<string, unknown>,
  ): void {
    const previousPending = this.pendingContent.get(blockId);
    this.pendingContent.set(blockId, {
      content,
      baseContent: previousPending?.baseContent ?? baseContent,
    });
    this.contentFlushPending = true;
    const previousTimer = this.contentTimers.get(blockId);
    if (previousTimer) clearTimeout(previousTimer);
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

    const updates = [...snapshot.entries()]
      .filter(([id]) => !!this.deps.getBlock(id))
      .map(([id, pending]) => {
        return {
          id,
          content: pending.content,
          baseContent: pending.baseContent,
        };
      });

    if (updates.length === 0) return;

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
    if (this.deps.persistViaOpLog) {
      // op-log 경로에서는 클라이언트 UUID가 서버 create id와 반드시 같아야 한다.
      // id 없이 push하면 DB는 gen_random_uuid()를 쓰고 UI는 다른 UUID를 쓰게 되어
      // 이후 patch_content가 "block not found"로 실패한다.
      const blockId = op.id || newNoteBlockClientId();
      const opWithId = op.id ? op : { ...op, id: blockId };
      await this.deps.persistViaOpLog(opWithId, { immediate: true });
      const existing = this.deps.getBlock(blockId);
      if (existing) {
        this.deps.triggerSave();
        return existing;
      }
      const fallback: NoteBlock = {
        id: blockId,
        document_id: op.documentId,
        parent_block_id: op.parent_block_id,
        type: op.blockType,
        order_index: op.order_index ?? 0,
        content: op.content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
      };
      this.deps.triggerSave();
      return fallback;
    }

    if (op.normalizeOrders !== undefined || op.transactionUpdates !== undefined) {
      const result = await postNoteBlockCreateTransaction(
        {
          id: op.id,
          documentId: op.documentId,
          blockType: op.blockType,
          content: op.content,
          order_index: op.order_index,
          parent_block_id: op.parent_block_id,
        },
        [
          ...(op.normalizeOrders ?? []),
          ...(op.transactionUpdates ?? []),
        ],
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
        baseContent: update.baseContent,
        expected_version: server.version,
      });
    }

    if (retries.length === 0) return;
    await this.patchWithVersionRetry(retries);
  }

  private async runPersistOp(op: NotePersistOp): Promise<void> {
    this.persistInFlight = true;
    try {
      if (this.deps.persistViaOpLog) {
        await this.deps.persistViaOpLog(op, { immediate: op.type !== 'patchContent' });
        this.deps.triggerSave();
        return;
      }

      switch (op.type) {
      case 'patchContent': {
        if (op.updates.length === 0) return;
        const patches = op.updates.map((update) => ({
          id: update.id,
          content: update.content,
          baseContent: update.baseContent,
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
            return;
          }
          throw error;
        }
        return;
      }
      case 'blockTransaction': {
        try {
          const patched = await postNoteBlockTransaction(
            op.patches,
            op.deleteIds,
            (id) => this.deps.getBlock(id),
          );
          if (patched.length > 0) this.deps.onServerPatches?.(patched);
          this.deps.triggerSave();
        } catch (error) {
          if (error instanceof NoteBlockVersionConflictError) {
            this.deps.onServerConflicts?.(error.conflicts as NoteBlock[]);
            return;
          }
          throw error;
        }
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

export type CreateBlockPersistArgs = {
  id?: string;
  documentId: string;
  blockType: NoteBlock['type'];
  content: Record<string, unknown>;
  order_index?: number;
  parent_block_id: string | null;
  normalizeOrders?: Array<{ id: string; order_index: number }>;
  transactionUpdates?: NoteBlockFieldPatch[];
};
