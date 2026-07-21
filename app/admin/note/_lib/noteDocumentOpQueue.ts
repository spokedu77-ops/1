import { devLogger } from '@/app/lib/logging/devLogger';
import {
  NoteBlockVersionConflictError,
  restoreNoteBlockFromTrash,
  type NoteBlockFieldPatch,
  type PatchedNoteBlock,
} from './noteBlocksApi';
import { newNoteBlockClientId } from './noteSyncGuards';
import { assertPersistOpIsSafe } from './notePersistOpGuard';
import type { NotePersistOp } from './noteDocumentOps';
import type { NoteBlock } from './types';

const CONTENT_DEBOUNCE_MS = 1500;

function hasProtectableContent(content: Record<string, unknown> | null | undefined): boolean {
  if (!content) return false;
  const textKeys = ['text', 'html', 'title', 'body', 'caption', 'url', 'icon', 'blockColor', 'page_document_id'];
  return textKeys.some((key) => {
    const value = content[key];
    if (key === 'html' && isEmptyHtml(value)) return false;
    return typeof value === 'string' && value.trim().length > 0;
  });
}

function isEmptyHtml(value: unknown): boolean {
  return value === ''
    || value === '<p></p>'
    || value === '<p><br></p>'
    || value === '<p><br class="ProseMirror-trailingBreak"></p>';
}

function isEmptyBodyPatch(content: Record<string, unknown>): boolean {
  const text = content.text;
  const html = content.html;
  return text === ''
    && (
      !('html' in content)
      || isEmptyHtml(html)
    );
}

function contentRecordsEqual(left: Record<string, unknown> | null | undefined, right: Record<string, unknown> | null | undefined): boolean {
  return JSON.stringify(left ?? {}) === JSON.stringify(right ?? {});
}

export type NoteDocumentOpQueueDeps = {
  getBlock: (blockId: string) => NoteBlock | undefined;
  getDocumentBlocks?: (documentId: string) => NoteBlock[];
  getActiveBlockId: () => string | null;
  triggerSave: () => void;
  onError?: (error: Error) => void;
  onServerPatches?: (blocks: PatchedNoteBlock[]) => void;
  onServerConflicts?: (blocks: NoteBlock[]) => void;
  onContentPersisted?: (blockIds: string[]) => void;
  /** op-log sync 활성 시 HTTP persist 대신 coordinator에 위임 */
  persistViaOpLog?: (
    op: NotePersistOp,
    options?: { immediate?: boolean },
  ) => Promise<void>;
};

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
        const storeBlock = this.deps.getBlock(id)!;
        const storeContent = storeBlock.content as Record<string, unknown> | null | undefined;
        const storeText = typeof storeContent?.text === 'string' ? storeContent.text : '';
        const pendingText = typeof pending.content.text === 'string' ? pending.content.text : '';
        const baseText = typeof pending.baseContent?.text === 'string' ? pending.baseContent.text : '';
        if (isEmptyBodyPatch(pending.content)) {
          const storeMatchesEmptyPatch = contentRecordsEqual(storeContent, pending.content);
          const explicitDelete = storeMatchesEmptyPatch && hasProtectableContent(pending.baseContent);
          const staleEmptyPatch = !explicitDelete && (
            storeText.length > 0
            || baseText.length > 0
            || hasProtectableContent(storeContent)
            || hasProtectableContent(pending.baseContent)
          );
          if (staleEmptyPatch) return null;
          if (storeMatchesEmptyPatch && !hasProtectableContent(pending.baseContent)) return null;
        }
        const content = storeText.length > pendingText.length
          ? { ...(storeContent ?? {}), ...pending.content, text: storeText }
          : pending.content;
        return {
          id,
          content,
          baseContent: pending.baseContent,
        };
      })
      .filter((update): update is NonNullable<typeof update> => update !== null);

    if (updates.length === 0) return;

    await this.enqueue({ type: 'patchContent', updates });
    this.deps.onContentPersisted?.(updates.map((update) => update.id));
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
    // Authority 예외: op-log restore 미구현 — HTTP trash restore만. 신규 HTTP mutation 금지.
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
    if (!this.deps.persistViaOpLog) {
      throw new Error('[Note] op-log persist is required; legacy HTTP create is disabled');
    }
    assertPersistOpIsSafe(op, this.readCurrentDocumentBlocks(op.documentId));
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

  private async runPersistOp(op: NotePersistOp): Promise<void> {
    this.persistInFlight = true;
    try {
      if (!this.deps.persistViaOpLog) {
        throw new Error('[Note] op-log persist is required; legacy HTTP persist is disabled');
      }
      assertPersistOpIsSafe(op, this.readCurrentDocumentBlocksForOp(op));
      await this.deps.persistViaOpLog(op, { immediate: true });
      this.deps.triggerSave();
    } finally {
      this.persistInFlight = false;
    }
  }

  private readCurrentDocumentBlocks(documentId: string): NoteBlock[] {
    if (this.deps.getDocumentBlocks) return this.deps.getDocumentBlocks(documentId);
    const activeId = this.deps.getActiveBlockId();
    const activeBlock = activeId ? this.deps.getBlock(activeId) : undefined;
    return activeBlock?.document_id === documentId ? [activeBlock] : [];
  }

  private readCurrentDocumentBlocksForOp(op: NotePersistOp): NoteBlock[] {
    if (op.type === 'createBlock') return this.readCurrentDocumentBlocks(op.documentId);
    if (op.type === 'blockTransaction' && op.creates?.[0]?.document_id) {
      return this.collectKnownBlocks(op.creates[0].document_id);
    }
    const firstId =
      op.type === 'patchContent' ? op.updates[0]?.id
        : op.type === 'patchFields' ? op.patches[0]?.id
          : op.type === 'softDelete' ? op.ids[0]
            : op.type === 'blockTransaction' ? op.patches[0]?.id ?? op.deleteIds[0]
              : op.type === 'purgeBlock' ? op.id
                : undefined;
    const block = firstId ? this.deps.getBlock(firstId) : undefined;
    if (!block) return [];
    return this.readCurrentDocumentBlocks(block.document_id);
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
  blocks?: NoteBlock[];
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
  allowEmptyVisibleCreate?: boolean;
};

export type BlockTransactionPersistArgs = {
  patches: NoteBlockFieldPatch[];
  deleteIds?: string[];
  deletedBlocks?: NoteBlock[];
};
