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
import {
  collectPendingSoftDeleteIds,
  coalescePushItems,
  excludeBlocksPendingSoftDelete,
  persistOpToPushItems,
} from './notePersistOpToBlockOps';
import { partitionOutboundForSafePush } from './noteSyncGuards';
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
      const outbound = await listOutboundOps(this.documentId);
      await this.rebaseFromServer({ allowRemotePull: outbound.length === 0 });
    } catch (error) {
      devLogger.error('[NoteSyncCoordinator] hydrate rebase failed', error);
    }
    // onBlocksUpdated 호출 안 함 — pipeline이 단일 dispatch로 적용
    return this.blocks;
  }

  async syncWithServer(initialBlocks: NoteBlock[]): Promise<void> {
    const local = await readLocalDocument(this.documentId);
    const outbound = await listOutboundOps(this.documentId);
    const lastSeq = await fetchSyncState(this.documentId);

    if (outbound.length > 0 && local) {
      this.blocks = local.blocks;
    } else {
      this.blocks = dedupeNoteBlocksById(initialBlocks);
    }
    this.lastAppliedSeq = lastSeq;

    await this.persistLocal();
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
    // 로컬 optimistic 상태는 pipeline.dispatch가 담당 — coordinator는 outbound만 적재
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

  /** outbound에 아직 push되지 않은 op가 있으면 pull을 미뤄야 한다. */
  async hasPendingOutbound(): Promise<boolean> {
    const outbound = await listOutboundOps(this.documentId);
    return outbound.length > 0;
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
      const outboundAll = await listOutboundOps(this.documentId);
      const allowRemotePull = outboundAll.length === 0;
      // eslint-disable-next-line no-await-in-loop
      await this.rebaseFromServer({ allowRemotePull });

      const outbound = await listOutboundOps(this.documentId);
      if (outbound.length === 0) return false;

      const coalesced = coalescePushItems(outbound.map(({ documentId: _d, createdAt: _c, ...op }) => op));
      const knownIds = new Set(this.blocks.map((block) => block.id));
      const { ready, deferred } = partitionOutboundForSafePush(coalesced, knownIds);

      if (ready.length === 0) {
        if (deferred.length > 0) this.schedulePush(500);
        return deferred.length > 0;
      }

      const consumedClientOpIds = ready.map((op) => op.clientOpId);

      // eslint-disable-next-line no-await-in-loop
      const result = await pushOps(this.documentId, this.lastAppliedSeq, ready);
      if (!result.ok) {
        await this.applyRemoteOps(result.ops, result.lastSeq);
        continue;
      }

      const pendingDeletes = collectPendingSoftDeleteIds(outbound);
      this.blocks = excludeBlocksPendingSoftDelete(
        mergeSnapshotPatches(this.blocks, result.blocks, {
          excludeBlockIds: pendingDeletes,
        }),
        pendingDeletes,
      );
      this.lastAppliedSeq = result.lastSeq;
      await removeOutboundOps(consumedClientOpIds);
      await this.persistLocal();
      this.callbacks.onBlocksUpdated(this.blocks, this.lastAppliedSeq);
      this.broadcastState();
      if (deferred.length > 0) return true;
      return true;
    }

    devLogger.error('[NoteSyncCoordinator] push exhausted retries');
    this.schedulePush(2000);
    return false;
  }

  private async rebaseFromServer(options?: { allowRemotePull?: boolean }): Promise<void> {
    const serverSeq = await fetchSyncState(this.documentId);

    if (this.lastAppliedSeq > serverSeq) {
      this.lastAppliedSeq = serverSeq;
      await this.persistLocal();
      return;
    }

      if (this.lastAppliedSeq < serverSeq) {
      if (options?.allowRemotePull === false) return;
      const pulled = await pullOps(this.documentId, this.lastAppliedSeq);
      if (pulled.ops.length > 0 || pulled.lastSeq !== this.lastAppliedSeq) {
        await this.applyRemoteOps(pulled.ops, pulled.lastSeq, { notify: false });
      }
    }
  }

  private async pullRemote(): Promise<void> {
    try {
      if (this.isPushing || await this.hasPendingOutbound()) {
        // create/patch가 아직 서버에 없으면 pull 스냅샷이 로컬 블록을 지울 수 있다.
        this.schedulePush(STRUCTURE_PUSH_DEBOUNCE_MS);
        return;
      }
      await this.rebaseFromServer();
      this.broadcastState();
    } catch (error) {
      devLogger.error('[NoteSyncCoordinator] pull failed', error);
    }
  }

  private async applyRemoteOps(
    ops: NoteBlockOpRecord[],
    lastSeq: number,
    options?: { notify?: boolean },
  ): Promise<void> {
    const outbound = await listOutboundOps(this.documentId);
    const pendingDeletes = collectPendingSoftDeleteIds(outbound);
    if (ops.length > 0) {
      this.blocks = applyRemoteOpRecords(this.blocks, ops);
    }
    if (pendingDeletes.size > 0) {
      this.blocks = excludeBlocksPendingSoftDelete(this.blocks, pendingDeletes);
    }
    this.lastAppliedSeq = lastSeq;
    await this.persistLocal();
    if (options?.notify !== false) {
      this.callbacks.onBlocksUpdated(this.blocks, this.lastAppliedSeq);
    }
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
