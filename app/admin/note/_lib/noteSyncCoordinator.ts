'use client';

import { devLogger } from '@/app/lib/logging/devLogger';
import { isNoteSyncRecoverableError, isNoteSyncTransientNetworkError } from './noteSyncErrors';
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
  collectPendingOutboundExcludedIds,
  mergeServerBlocksIntoLocalSnapshot,
  shouldTrustEmptyLocalWithOutbound,
  coalescePushItems,
  excludeBlocksPendingSoftDelete,
  persistOpToPushItems,
} from './notePersistOpToBlockOps';
import {
  contentHasMediaPresence,
  decideRegressiveContentOp,
  readAuthorityBlockText,
} from './noteAuthority';
import { buildKnownBlockIdsForPush,
  isPureIdentityLeaveOrRelocationPush,
  outboundHasPureIdentityLeaveOrRelocation,
  partitionOutboundForSafePush,
} from './noteSyncGuards';
import type { NotePersistOp } from './noteDocumentOps';
import { dedupeNoteBlocksById } from '@/app/lib/note/noteBlockTree';
import { mergeBlocksWithStoreContent } from './noteBlockStateMerge';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import { traceApiEgress, type SnapshotTraceOrigin } from './noteFlickerTrace';
import {
  markNoteLocalSave,
} from './noteReconcileIdle';
import {
  getStructuralExcludeIds,
  syncStructuralExcludeFromOutbound,
} from './noteStructuralExcludeRegistry';

const CONTENT_PUSH_DEBOUNCE_MS = 1500;
const STRUCTURE_PUSH_DEBOUNCE_MS = 0;
const LEADER_CHANNEL = 'spm-note-sync-leader-v1';
const LEADER_LOCK_PREFIX = 'spm-note-sync-leader-lock';
const MAX_PUSH_ATTEMPTS = 8;

/** Authority: clear intent는 push, store에 본문이 남은 stale empty patch만 drop */
function filterRegressivePatchContentOps(
  ops: NoteBlockOpPushItem[],
  blocks: NoteBlock[],
): { safeReady: NoteBlockOpPushItem[]; dropStaleIds: string[] } {
  const blocksById = new Map(blocks.map((block) => [block.id, block]));
  const safeReady: NoteBlockOpPushItem[] = [];
  const dropStaleIds: string[] = [];
  for (const op of ops) {
    if (op.opType !== 'patch_content') {
      safeReady.push(op);
      continue;
    }
    const payload = op.payload;
    if (payload.opType !== 'patch_content') {
      safeReady.push(op);
      continue;
    }
    const block = blocksById.get(payload.blockId);
    const localText = block ? readAuthorityBlockText(block.content) : '';
    const patchText = readAuthorityBlockText(payload.content);
    const decision = decideRegressiveContentOp({
      localText,
      patchText,
      localHasMediaPresence: block
        ? contentHasMediaPresence(block.content)
        : false,
      patchHasMediaPresence: contentHasMediaPresence(payload.content),
    });
    if (decision === 'drop_stale') {
      dropStaleIds.push(op.clientOpId);
      continue;
    }
    safeReady.push(op);
  }
  return { safeReady, dropStaleIds };
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
  try {
    const res = await fetch(
      `/api/admin/note/ops/state?documentId=${encodeURIComponent(documentId)}`,
      { credentials: 'include' },
    );
    if (!res.ok) throw new Error('sync state fetch failed');
    const json = (await res.json()) as { lastSeq?: number };
    return typeof json.lastSeq === 'number' ? json.lastSeq : 0;
  } catch (error) {
    if (isNoteSyncTransientNetworkError(error)) {
      throw new Error('sync state fetch failed');
    }
    throw error;
  }
}

async function pullOps(documentId: string, since: number): Promise<{ lastSeq: number; ops: NoteBlockOpRecord[] }> {
  traceApiEgress('pullOps', documentId);
  try {
    const res = await fetch(
      `/api/admin/note/ops/pull?documentId=${encodeURIComponent(documentId)}&since=${since}`,
      { credentials: 'include' },
    );
    if (!res.ok) throw new Error('op pull failed');
    return res.json() as Promise<{ lastSeq: number; ops: NoteBlockOpRecord[] }>;
  } catch (error) {
    if (isNoteSyncTransientNetworkError(error)) {
      throw new Error('op pull failed');
    }
    throw error;
  }
}

async function pushOps(
  documentId: string,
  baseSeq: number,
  ops: NoteBlockOpPushItem[],
): Promise<PushResponse> {
  traceApiEgress('pushOps', documentId);
  try {
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
  } catch (error) {
    if (isNoteSyncTransientNetworkError(error)) {
      throw new Error('op push failed');
    }
    throw error;
  }
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

  /** 리더 미선출 시 enqueue가 남긴 flush — lock/else에서 소진 */
  private pendingPushDelayMs: number | null = null;

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
    const outbound = await listOutboundOps(this.documentId);
    syncStructuralExcludeFromOutbound(this.documentId, outbound);
    try {
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
    syncStructuralExcludeFromOutbound(this.documentId, outbound);
    const lastSeq = await fetchSyncState(this.documentId);

    const serverBlocks = dedupeNoteBlocksById(initialBlocks);
    const excludedIds = collectPendingOutboundExcludedIds(outbound, this.documentId);
    if (outbound.length > 0) {
      if (local && local.blocks.length > 0) {
        this.blocks = mergeServerBlocksIntoLocalSnapshot(
          local.blocks,
          serverBlocks,
          excludedIds,
        );
      } else if (shouldTrustEmptyLocalWithOutbound(outbound, serverBlocks)) {
        this.blocks = excludeBlocksPendingSoftDelete(serverBlocks, excludedIds);
      } else {
        this.blocks = excludeBlocksPendingSoftDelete(serverBlocks, excludedIds);
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
    if (this.disposed) {
      const live = getNoteSyncCoordinator(this.documentId, this.callbacks);
      if (live !== this) {
        await live.enqueuePersistOp(op, options);
        return;
      }
    }
    const items = persistOpToPushItems(op);
    if (items.length === 0) return;
    await appendOutboundOps(this.documentId, items);
    const outbound = await listOutboundOps(this.documentId);
    syncStructuralExcludeFromOutbound(this.documentId, outbound);
    const delay = options?.immediate || op.type !== 'patchContent'
      ? STRUCTURE_PUSH_DEBOUNCE_MS
      : CONTENT_PUSH_DEBOUNCE_MS;
    this.pendingPushDelayMs = delay;
    this.startLeaderElection();
    this.isLeader = true;
    if (options?.immediate || op.type !== 'patchContent') {
      await this.flushPush();
      if (await this.hasPendingOutbound()) {
        this.schedulePush(250);
        this.scheduleOutboundFlushWatchdog(250);
      }
      return;
    }
    this.schedulePush(delay);
    this.scheduleOutboundFlushWatchdog(delay);
  }

  isDisposedPublic(): boolean {
    return this.disposed;
  }

  private outboundFlushWatchdog: ReturnType<typeof setTimeout> | null = null;

  /** Playwright 등 locks 부재·선출 레이스에서도 outbound가 무기한 남는 것을 막는다 */
  private scheduleOutboundFlushWatchdog(delayMs: number): void {
    if (this.outboundFlushWatchdog) clearTimeout(this.outboundFlushWatchdog);
    this.outboundFlushWatchdog = setTimeout(() => {
      this.outboundFlushWatchdog = null;
      if (this.disposed) return;
      void (async () => {
        if (!(await this.hasPendingOutbound())) return;
        if (!this.isLeader) {
          this.becomeLeaderAndFlush();
          return;
        }
        this.schedulePush(0);
      })();
    }, Math.max(delayMs, 100) + 50);
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
    if (this.outboundFlushWatchdog) clearTimeout(this.outboundFlushWatchdog);
    this.outboundFlushWatchdog = null;
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
    if (this.disposed) {
      const live = coordinators.get(this.documentId);
      if (live && live !== this && !live.disposed) {
        await live.flushPush();
      }
      return;
    }
    if (!this.isLeader) {
      this.isLeader = true;
    }
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
          if (this.disposed) break;
          const err = error instanceof Error ? error : new Error(String(error));
          const recoverable = isNoteSyncTransientNetworkError(error)
            || isNoteSyncRecoverableError(err.message);
          if (!recoverable) {
            this.callbacks.onError?.(err);
            devLogger.error('[NoteSyncCoordinator] push failed', err);
          }
          this.schedulePush(1000);
          break;
        }
      } while (this.pushRequested && !this.disposed);
    } finally {
      this.isPushing = false;
    }
  }

  private async pushBatchOnce(): Promise<boolean> {
    const isActiveDocument =
      useNoteBlockStore.getState().activeDocumentId === this.documentId;

    // activeDocument는 Project(store 쓰기)용. identityLeave·relocation Outbound drain은 막지 않는다.
    if (!isActiveDocument) {
      const pending = await listOutboundOps(this.documentId);
      const pendingItems = pending.map(({ documentId: _d, createdAt: _c, ...op }) => op);
      if (!outboundHasPureIdentityLeaveOrRelocation(pendingItems)) {
        this.schedulePush(2000);
        return false;
      }
    }

    const storeMerged = useNoteBlockStore.getState().getBlocksArray()
      .filter((block) => block.document_id === this.documentId);
    if (isActiveDocument && storeMerged.length > 0) {
      this.blocks = dedupeNoteBlocksById(mergeBlocksWithStoreContent(storeMerged));
    }

    for (let attempt = 0; attempt < MAX_PUSH_ATTEMPTS; attempt += 1) {
      // outbound이 있어도 seq를 맞춰야 push baseSeq가 서버와 일치한다.
      // eslint-disable-next-line no-await-in-loop
      await this.rebaseFromServer({ allowRemotePull: true });

      const outbound = await listOutboundOps(this.documentId);
      if (outbound.length === 0) return false;

      const coalesced = coalescePushItems(outbound.map(({ documentId: _d, createdAt: _c, ...op }) => op));
      if (!isActiveDocument && !outboundHasPureIdentityLeaveOrRelocation(coalesced)) {
        this.schedulePush(2000);
        return false;
      }
      const knownIds = buildKnownBlockIdsForPush(this.blocks, coalesced);
      let { ready, deferred } = partitionOutboundForSafePush(coalesced, knownIds);
      if (!isActiveDocument) {
        const leaveReady = ready.filter(isPureIdentityLeaveOrRelocationPush);
        const contentDeferred = ready.filter((item) => !isPureIdentityLeaveOrRelocationPush(item));
        ready = leaveReady;
        deferred = [...contentDeferred, ...deferred];
      }
      const { safeReady, dropStaleIds } = filterRegressivePatchContentOps(ready, this.blocks);
      if (dropStaleIds.length > 0) {
        // Authority drop_stale만 outbound에서 제거 — clear intent는 절대 여기서 지우지 않음
        // eslint-disable-next-line no-await-in-loop
        await removeOutboundOps(dropStaleIds);
      }

      if (safeReady.length === 0) {
        // ready가 없으면 while을 즉시 돌리지 않는다 — schedulePush로만 재시도.
        // true를 반환하면 flushPush의 while이 ops/state만 폭주한다.
        // inactive일 때 content만 deferred면 leave drain 후 ops/state 폴링 스피너를 돌리지 않는다.
        if (deferred.length > 0 && isActiveDocument) this.schedulePush(500);
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

      const pendingExcluded = getStructuralExcludeIds(this.documentId);
      this.blocks = excludeBlocksPendingSoftDelete(
        mergeSnapshotPatches(this.blocks, result.blocks, {
          excludeBlockIds: pendingExcluded,
        }),
        pendingExcluded,
      );
      this.lastAppliedSeq = result.lastSeq;
      await removeOutboundOps(consumedClientOpIds);
      const remainingOutbound = await listOutboundOps(this.documentId);
      syncStructuralExcludeFromOutbound(this.documentId, remainingOutbound);
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
      if (this.disposed || isNoteSyncTransientNetworkError(error)) return;
      const err = error instanceof Error ? error : new Error(String(error));
      if (isNoteSyncRecoverableError(err.message)) {
        this.schedulePush(1000);
        return;
      }
      devLogger.error('[NoteSyncCoordinator] pull failed', error);
    }
  }

  private async applyRemoteOps(
    ops: NoteBlockOpRecord[],
    lastSeq: number,
    options?: { notify?: boolean },
  ): Promise<void> {
    const outbound = await listOutboundOps(this.documentId);
    syncStructuralExcludeFromOutbound(this.documentId, outbound);
    const pendingExcluded = getStructuralExcludeIds(this.documentId);
    if (ops.length > 0) {
      this.blocks = applyRemoteOpRecords(this.blocks, ops);
    }
    if (pendingExcluded.size > 0) {
      this.blocks = excludeBlocksPendingSoftDelete(this.blocks, pendingExcluded);
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

  private becomeLeaderAndFlush(): void {
    this.isLeader = true;
    const delay = this.pendingPushDelayMs ?? STRUCTURE_PUSH_DEBOUNCE_MS;
    this.pendingPushDelayMs = null;
    this.schedulePush(delay);
  }

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

    // Web Locks는 환경마다 즉시 grant되지 않거나(또는 잔여 lock) soft_delete outbound가
    // 무기한 남을 수 있다. clientOpId unique로 중복 push는 안전하므로 즉시 self-elect.
    this.becomeLeaderAndFlush();

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
        }),
      ).catch(() => {
        this.isLeader = true;
      });
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
  if (existing && !existing.isDisposedPublic()) {
    existing.updateCallbacks(callbacks);
    return existing;
  }
  if (existing) {
    coordinators.delete(documentId);
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

/** Strict Mode: remount의 새 coordinator를 옛 pipeline dispose가 죽이지 않게 인스턴스 가드 */
export function disposeNoteSyncCoordinatorInstance(
  documentId: string,
  expected: NoteSyncCoordinator,
): void {
  expected.dispose();
  if (coordinators.get(documentId) === expected) {
    coordinators.delete(documentId);
  }
}
