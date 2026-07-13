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
  mergeServerBlocksIntoLocalSnapshot,
  shouldTrustEmptyLocalWithOutbound,
  coalescePushItems,
  excludeBlocksPendingSoftDelete,
  filterStalePendingSoftDeletes,
  findOutboundOpsSupersededByServerRestore,
  persistOpToPushItems,
} from './notePersistOpToBlockOps';
import { buildKnownBlockIdsForPush, partitionOutboundForSafePush } from './noteSyncGuards';
import type { NotePersistOp } from './noteDocumentOps';
import { dedupeNoteBlocksById } from '@/app/lib/note/noteBlockTree';
import { mergeBlocksWithStoreContent } from './noteBlockStateMerge';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import { traceApiEgress, type SnapshotTraceOrigin } from './noteFlickerTrace';
import {
  markNoteLocalSave,
  getPendingBlockDeleteIds,
} from './noteReconcileIdle';

const CONTENT_PUSH_DEBOUNCE_MS = 1500;
const STRUCTURE_PUSH_DEBOUNCE_MS = 0;
const LEADER_CHANNEL = 'spm-note-sync-leader-v1';
const LEADER_LOCK_PREFIX = 'spm-note-sync-leader-lock';
const MAX_PUSH_ATTEMPTS = 8;

function readBlockBodyText(content: unknown): string {
  if (!content || typeof content !== 'object') return '';
  const text = (content as Record<string, unknown>).text;
  return typeof text === 'string' ? text : '';
}

/** 스토어/로컬에 본문이 있는데 patch가 비우려 할 때 push 차단 — reconcile 레이스 서버 wipe 방지 */
function filterRegressivePatchContentOps(
  ops: NoteBlockOpPushItem[],
  blocks: NoteBlock[],
): NoteBlockOpPushItem[] {
  const blocksById = new Map(blocks.map((block) => [block.id, block]));
  return ops.filter((op) => {
    if (op.opType !== 'patch_content') return true;
    const payload = op.payload;
    if (payload.opType !== 'patch_content') return true;
    const block = blocksById.get(payload.blockId);
    if (!block) return true;
    const currentText = readBlockBodyText(block.content);
    const patchText = readBlockBodyText(payload.content);
    if (currentText.length > 0 && patchText.length === 0) return false;
    return true;
  });
}

export type NoteSyncCoordinatorCallbacks = {
  onBlocksUpdated: (
    blocks: NoteBlock[],
    lastAppliedSeq: number,
    origin: SnapshotTraceOrigin,
  ) => void;
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
  traceApiEgress('fetchSyncState', documentId);
  const res = await fetch(
    `/api/admin/note/ops/state?documentId=${encodeURIComponent(documentId)}`,
    { credentials: 'include' },
  );
  if (!res.ok) throw new Error('sync state fetch failed');
  const json = (await res.json()) as { lastSeq?: number };
  return typeof json.lastSeq === 'number' ? json.lastSeq : 0;
}

async function pullOps(documentId: string, since: number): Promise<{ lastSeq: number; ops: NoteBlockOpRecord[] }> {
  traceApiEgress('pullOps', documentId);
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
  traceApiEgress('pushOps', documentId);
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
    const normalized = message.toLowerCase();
    if (normalized.includes('block not found')) {
      throw new Error(message);
    }
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

    const serverBlocks = dedupeNoteBlocksById(initialBlocks);
    const pendingDeletes = filterStalePendingSoftDeletes(
      serverBlocks,
      collectPendingSoftDeleteIds(outbound),
    );
    const supersededOpIds = findOutboundOpsSupersededByServerRestore(outbound, serverBlocks);
    if (supersededOpIds.length > 0) {
      await removeOutboundOps(supersededOpIds);
    }
    if (outbound.length > 0) {
      if (local && local.blocks.length > 0) {
        this.blocks = mergeServerBlocksIntoLocalSnapshot(
          local.blocks,
          serverBlocks,
          pendingDeletes,
        );
      } else if (shouldTrustEmptyLocalWithOutbound(outbound, serverBlocks)) {
        this.blocks = excludeBlocksPendingSoftDelete(serverBlocks, pendingDeletes);
      } else {
        this.blocks = excludeBlocksPendingSoftDelete(serverBlocks, pendingDeletes);
      }
    } else {
      this.blocks = serverBlocks;
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
    if (useNoteBlockStore.getState().activeDocumentId !== this.documentId) {
      this.schedulePush(2000);
      return false;
    }

    const storeMerged = useNoteBlockStore.getState().getBlocksArray()
      .filter((block) => block.document_id === this.documentId);
    if (storeMerged.length > 0) {
      this.blocks = dedupeNoteBlocksById(mergeBlocksWithStoreContent(storeMerged));
    }

    for (let attempt = 0; attempt < MAX_PUSH_ATTEMPTS; attempt += 1) {
      // outbound이 있어도 seq를 맞춰야 push baseSeq가 서버와 일치한다.
      // eslint-disable-next-line no-await-in-loop
      await this.rebaseFromServer({ allowRemotePull: true });

      const outbound = await listOutboundOps(this.documentId);
      if (outbound.length === 0) return false;

      const coalesced = coalescePushItems(outbound.map(({ documentId: _d, createdAt: _c, ...op }) => op));
      const knownIds = buildKnownBlockIdsForPush(this.blocks, coalesced);
      const { ready, deferred } = partitionOutboundForSafePush(coalesced, knownIds);
      const safeReady = filterRegressivePatchContentOps(ready, this.blocks);
      const blockedRegressiveIds = ready
        .filter((op) => !safeReady.some((safe) => safe.clientOpId === op.clientOpId))
        .map((op) => op.clientOpId);
      if (blockedRegressiveIds.length > 0) {
        // 서버 wipe 방지용으로 차단된 patch는 outbound에서 제거 — 무한 재시도 방지
        // eslint-disable-next-line no-await-in-loop
        await removeOutboundOps(blockedRegressiveIds);
      }

      if (safeReady.length === 0) {
        // ready가 없으면 while을 즉시 돌리지 않는다 — schedulePush로만 재시도.
        // true를 반환하면 flushPush의 while이 ops/state만 폭주한다.
        if (deferred.length > 0) this.schedulePush(500);
        return false;
      }

      const consumedClientOpIds = safeReady.map((op) => op.clientOpId);

      // eslint-disable-next-line no-await-in-loop
      const result = await pushOps(this.documentId, this.lastAppliedSeq, safeReady);
      if (!result.ok) {
        await this.applyRemoteOps(result.ops, result.lastSeq);
        const freshSeq = await fetchSyncState(this.documentId);
        if (freshSeq > this.lastAppliedSeq) {
          this.lastAppliedSeq = freshSeq;
          await this.persistLocal();
        }
        continue;
      }

      const pendingDeletes = new Set([
        ...collectPendingSoftDeleteIds(outbound),
        ...getPendingBlockDeleteIds(this.documentId),
      ]);
      this.blocks = excludeBlocksPendingSoftDelete(
        mergeSnapshotPatches(this.blocks, result.blocks, {
          excludeBlockIds: pendingDeletes,
        }),
        pendingDeletes,
      );
      this.lastAppliedSeq = result.lastSeq;
      await removeOutboundOps(consumedClientOpIds);
      await this.persistLocal();
      markNoteLocalSave(this.documentId);
      this.callbacks.onBlocksUpdated(this.blocks, this.lastAppliedSeq, 'coordinator:push');
      this.broadcastState();
      // deferred가 남아 있을 때만 while 계속 — 없으면 한 번 더 state 폴링하지 않음
      return deferred.length > 0;
    }

    devLogger.warn('[NoteSyncCoordinator] push exhausted retries; scheduling recovery');
    this.schedulePush(3000);
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
      if (useNoteBlockStore.getState().activeDocumentId !== this.documentId) {
        return;
      }
      const storeMerged = useNoteBlockStore.getState().getBlocksArray()
        .filter((block) => block.document_id === this.documentId);
      if (storeMerged.length > 0) {
        this.blocks = dedupeNoteBlocksById(mergeBlocksWithStoreContent(storeMerged));
      }
      if (this.isPushing || await this.hasPendingOutbound()) {
        // create/patch가 아직 서버에 없으면 pull 스냅샷이 로컬 블록을 지울 수 있다.
        this.schedulePush(STRUCTURE_PUSH_DEBOUNCE_MS);
        return;
      }
      await this.rebaseFromServer();
      this.callbacks.onBlocksUpdated(this.blocks, this.lastAppliedSeq, 'coordinator:pull');
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
      this.callbacks.onBlocksUpdated(this.blocks, this.lastAppliedSeq, 'coordinator:applyRemote');
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
          this.callbacks.onBlocksUpdated(this.blocks, this.lastAppliedSeq, 'coordinator:leader');
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
