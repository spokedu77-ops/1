'use client';

import { devLogger } from '@/app/lib/logging/devLogger';
import { isNoteSyncRecoverableError } from './noteSyncErrors';
import type { NoteBlockOpPushItem, NoteBlockOpRecord, NoteBlockSnapshot } from '@/app/lib/note/noteBlockOpTypes';
import type { NoteBlock } from './types';
import {
  appendOutboundOps,
  listOutboundOps,
  readLocalDocument,
  removeOutboundOps,
  writeLocalDocument,
} from './noteLocalDb';
import { applyRemoteOpRecords, mergeSnapshotPatches } from './noteOpReplay';
import { coalescePushItems, persistOpToPushItems } from './notePersistOpToBlockOps';
import type { NotePersistOp } from './noteDocumentOps';
import { dedupeNoteBlocksById } from '@/app/lib/note/noteBlockTree';

const CONTENT_PUSH_DEBOUNCE_MS = 1500;
const STRUCTURE_PUSH_DEBOUNCE_MS = 0;
const LEADER_CHANNEL = 'spm-note-sync-leader-v1';
const LEADER_LOCK_PREFIX = 'spm-note-sync-leader-lock';
const MAX_PUSH_ATTEMPTS = 8;

export type NoteSyncCoordinatorCallbacks = {
  onBlocksUpdated: (blocks: NoteBlock[], lastAppliedSeq: number) => void;
  onError?: (error: Error) => void;
};

let tabInstanceId: string | null = null;

function getTabInstanceId(): string {
  if (!tabInstanceId) {
    tabInstanceId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `tab-${Date.now()}`;
  }
  return tabInstanceId;
}

type PushResponse =
  | { ok: true; lastSeq: number; appliedClientOpIds: string[]; blocks: NoteBlockSnapshot[] }
  | { ok: false; error: 'seq_conflict'; lastSeq: number; ops: NoteBlockOpRecord[] };

async function fetchSyncState(documentId: string): Promise<number> {
  const res = await fetch(
    `/api/admin/note/ops/state?documentId=${encodeURIComponent(documentId)}`,
    { credentials: 'include' },
  );
  if (!res.ok) throw new Error('sync state fetch failed');
  const json = (await res.json()) as { lastSeq?: number };
  return typeof json.lastSeq === 'number' ? json.lastSeq : 0;
}

async function pullOps(documentId: string, since: number): Promise<{ lastSeq: number; ops: NoteBlockOpRecord[] }> {
  const res = await fetch(
    `/api/admin/note/ops/pull?documentId=${encodeURIComponent(documentId)}&since=${since}`,
    { credentials: 'include' },
  );
  if (!res.ok) throw new Error('op pull failed');
  return res.json() as Promise<{ lastSeq: number; ops: NoteBlockOpRecord[] }>;
}

async function pushOps(
  documentId: string,
  baseSeq: number,
  ops: NoteBlockOpPushItem[],
): Promise<PushResponse> {
  const res = await fetch('/api/admin/note/ops/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ documentId, baseSeq, ops }),
  });
  const json = await res.json().catch(() => ({}));
  if (res.status === 409) {
    return {
      ok: false,
      error: 'seq_conflict',
      lastSeq: typeof json.lastSeq === 'number' ? json.lastSeq : baseSeq,
      ops: Array.isArray(json.ops) ? json.ops as NoteBlockOpRecord[] : [],
    };
  }
  if (!res.ok) {
    const message = (json as { error?: string }).error || 'op push failed';
    if (res.status === 500 && isNoteSyncRecoverableError(message)) {
      const state = await fetchSyncState(documentId);
      return {
        ok: false,
        error: 'seq_conflict',
        lastSeq: state,
        ops: [],
      };
    }
    throw new Error(message);
  }
  return {
    ok: true,
    lastSeq: json.lastSeq as number,
    appliedClientOpIds: json.appliedClientOpIds as string[],
    blocks: json.blocks as NoteBlockSnapshot[],
  };
}

/** 문서별 local-first sync — IndexedDB + op push/pull */
export class NoteSyncCoordinator {
  private pushTimer: ReturnType<typeof setTimeout> | null = null;

  private isLeader = false;

  private isPushing = false;

  private pushRequested = false;

  private disposed = false;

  private leaderChannel: BroadcastChannel | null = null;

  private leaderListener: ((event: MessageEvent) => void) | null = null;

  private leaderLockRelease: (() => void) | null = null;

  private blocks: NoteBlock[] = [];

  private lastAppliedSeq = 0;

  constructor(
    private readonly documentId: string,
    private callbacks: NoteSyncCoordinatorCallbacks,
  ) {}

  updateCallbacks(callbacks: NoteSyncCoordinatorCallbacks): void {
    this.callbacks = callbacks;
  }

  async hydrateFromLocal(): Promise<NoteBlock[] | null> {
    const local = await readLocalDocument(this.documentId);
    if (!local) return null;
    this.blocks = local.blocks;
    this.lastAppliedSeq = local.lastAppliedSeq;
    try {
      await this.rebaseFromServer();
    } catch (error) {
      devLogger.error('[NoteSyncCoordinator] hydrate rebase failed', error);
    }
    this.callbacks.onBlocksUpdated(this.blocks, this.lastAppliedSeq);
    return this.blocks;
  }

  async syncWithServer(initialBlocks: NoteBlock[]): Promise<void> {
    const local = await readLocalDocument(this.documentId);
    const outbound = await listOutboundOps(this.documentId);
    const lastSeq = await fetchSyncState(this.documentId);

    if (outbound.length > 0 && local && local.blocks.length > 0) {
      this.blocks = local.blocks;
    } else {
      this.blocks = dedupeNoteBlocksById(initialBlocks);
    }
    this.lastAppliedSeq = lastSeq;

    await this.persistLocal();
    this.callbacks.onBlocksUpdated(this.blocks, this.lastAppliedSeq);
    this.startLeaderElection();
    if (outbound.length > 0) {
      void this.flushPush();
    }
  }

  setBlocks(blocks: NoteBlock[]): void {
    this.blocks = dedupeNoteBlocksById(blocks);
    void this.persistLocal();
  }

  getBlocks(): NoteBlock[] {
    return this.blocks;
  }

  getLastAppliedSeq(): number {
    return this.lastAppliedSeq;
  }

  async enqueuePersistOp(op: NotePersistOp, options?: { immediate?: boolean }): Promise<void> {
    const items = persistOpToPushItems(op);
    if (items.length === 0) return;
    await appendOutboundOps(this.documentId, items);
    const delay = options?.immediate || op.type !== 'patchContent'
      ? STRUCTURE_PUSH_DEBOUNCE_MS
      : CONTENT_PUSH_DEBOUNCE_MS;
    if (this.isLeader) {
      this.schedulePush(delay);
    } else {
      this.requestLeaderFlush();
    }
  }

  schedulePull(): void {
    if (!this.isLeader) return;
    void this.pullRemote();
  }

  async drain(): Promise<void> {
    if (this.pushTimer) {
      clearTimeout(this.pushTimer);
      this.pushTimer = null;
    }
    await this.flushPush();
  }

  dispose(): void {
    this.disposed = true;
    if (this.pushTimer) clearTimeout(this.pushTimer);
    if (this.leaderChannel && this.leaderListener) {
      this.leaderChannel.removeEventListener('message', this.leaderListener);
      this.leaderChannel.close();
    }
    this.leaderChannel = null;
    this.leaderListener = null;
    this.isLeader = false;
    this.leaderLockRelease?.();
    this.leaderLockRelease = null;
  }

  private requestLeaderFlush(): void {
    if (!this.leaderChannel) return;
    this.leaderChannel.postMessage({
      type: 'flush_request',
      documentId: this.documentId,
      tabId: getTabInstanceId(),
    });
  }

  private schedulePush(delayMs: number): void {
    if (this.pushTimer) clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => {
      this.pushTimer = null;
      void this.flushPush();
    }, delayMs);
  }

  private async flushPush(): Promise<void> {
    if (!this.isLeader || this.disposed) return;
    if (this.isPushing) {
      this.pushRequested = true;
      return;
    }
    this.isPushing = true;
    try {
      do {
        this.pushRequested = false;
        try {
          // eslint-disable-next-line no-await-in-loop
          while (await this.pushBatchOnce()) {
            if (this.disposed) break;
          }
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          if (!isNoteSyncRecoverableError(err.message)) {
            this.callbacks.onError?.(err);
          }
          devLogger.error('[NoteSyncCoordinator] push failed', err);
          this.schedulePush(1000);
          break;
        }
      } while (this.pushRequested && !this.disposed);
    } finally {
      this.isPushing = false;
    }
  }

  private async pushBatchOnce(): Promise<boolean> {
    for (let attempt = 0; attempt < MAX_PUSH_ATTEMPTS; attempt += 1) {
      await this.rebaseFromServer();

      const outbound = await listOutboundOps(this.documentId);
      if (outbound.length === 0) return false;

      const consumedClientOpIds = outbound.map((op) => op.clientOpId);
      const ops = coalescePushItems(outbound.map(({ documentId: _d, createdAt: _c, ...op }) => op));

      // eslint-disable-next-line no-await-in-loop
      const result = await pushOps(this.documentId, this.lastAppliedSeq, ops);
      if (!result.ok) {
        await this.applyRemoteOps(result.ops, result.lastSeq);
        continue;
      }

      this.blocks = mergeSnapshotPatches(this.blocks, result.blocks);
      this.lastAppliedSeq = result.lastSeq;
      await removeOutboundOps(consumedClientOpIds);
      await this.persistLocal();
      this.callbacks.onBlocksUpdated(this.blocks, this.lastAppliedSeq);
      this.broadcastState();
      return true;
    }

    devLogger.error('[NoteSyncCoordinator] push exhausted retries');
    this.schedulePush(2000);
    return false;
  }

  private async rebaseFromServer(): Promise<void> {
    const serverSeq = await fetchSyncState(this.documentId);

    if (this.lastAppliedSeq > serverSeq) {
      this.lastAppliedSeq = serverSeq;
      await this.persistLocal();
      return;
    }

    if (this.lastAppliedSeq < serverSeq) {
      const pulled = await pullOps(this.documentId, this.lastAppliedSeq);
      if (pulled.ops.length > 0 || pulled.lastSeq !== this.lastAppliedSeq) {
        await this.applyRemoteOps(pulled.ops, pulled.lastSeq);
      }
    }
  }

  private async pullRemote(): Promise<void> {
    try {
      await this.rebaseFromServer();
      this.broadcastState();
    } catch (error) {
      devLogger.error('[NoteSyncCoordinator] pull failed', error);
    }
  }

  private async applyRemoteOps(ops: NoteBlockOpRecord[], lastSeq: number): Promise<void> {
    if (ops.length > 0) {
      this.blocks = applyRemoteOpRecords(this.blocks, ops);
    }
    this.lastAppliedSeq = lastSeq;
    await this.persistLocal();
    this.callbacks.onBlocksUpdated(this.blocks, this.lastAppliedSeq);
  }

  private async persistLocal(): Promise<void> {
    await writeLocalDocument({
      documentId: this.documentId,
      lastAppliedSeq: this.lastAppliedSeq,
      blocks: this.blocks,
      updatedAt: Date.now(),
    });
  }

  private leaderElectionStarted = false;

  private startLeaderElection(): void {
    if (this.leaderElectionStarted) return;
    this.leaderElectionStarted = true;

    if (typeof BroadcastChannel !== 'undefined') {
      this.leaderChannel = new BroadcastChannel(LEADER_CHANNEL);
      this.leaderListener = (event: MessageEvent) => {
        const data = event.data as {
          type?: string;
          documentId?: string;
          tabId?: string;
          blocks?: NoteBlock[];
          lastSeq?: number;
        };
        if (data?.documentId !== this.documentId) return;
        if (data.tabId === getTabInstanceId()) return;

        if (data.type === 'state' && Array.isArray(data.blocks)) {
          this.blocks = data.blocks;
          this.lastAppliedSeq = typeof data.lastSeq === 'number'
            ? data.lastSeq
            : this.lastAppliedSeq;
          void this.persistLocal();
          this.callbacks.onBlocksUpdated(this.blocks, this.lastAppliedSeq);
        }
        if (data.type === 'flush_request' && this.isLeader) {
          this.schedulePush(CONTENT_PUSH_DEBOUNCE_MS);
        }
      };
      this.leaderChannel.addEventListener('message', this.leaderListener);
    }

    const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
    if (locks && typeof locks.request === 'function') {
      void locks.request(
        `${LEADER_LOCK_PREFIX}:${this.documentId}`,
        { mode: 'exclusive' },
        () => new Promise<void>((resolve) => {
          if (this.disposed) {
            resolve();
            return;
          }
          this.isLeader = true;
          this.leaderLockRelease = resolve;
          this.schedulePush(STRUCTURE_PUSH_DEBOUNCE_MS);
        }),
      ).catch(() => {
        this.isLeader = true;
      });
    } else {
      this.isLeader = true;
    }
  }

  private broadcastState(): void {
    if (!this.leaderChannel) return;
    this.leaderChannel.postMessage({
      type: 'state',
      documentId: this.documentId,
      tabId: getTabInstanceId(),
      blocks: this.blocks,
      lastSeq: this.lastAppliedSeq,
    });
  }
}

const coordinators = new Map<string, NoteSyncCoordinator>();

export function getNoteSyncCoordinator(
  documentId: string,
  callbacks: NoteSyncCoordinatorCallbacks,
): NoteSyncCoordinator {
  const existing = coordinators.get(documentId);
  if (existing) {
    existing.updateCallbacks(callbacks);
    return existing;
  }
  const coordinator = new NoteSyncCoordinator(documentId, callbacks);
  coordinators.set(documentId, coordinator);
  return coordinator;
}

export function disposeNoteSyncCoordinator(documentId: string): void {
  const existing = coordinators.get(documentId);
  existing?.dispose();
  coordinators.delete(documentId);
}
