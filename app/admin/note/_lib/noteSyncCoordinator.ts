'use client';

import { devLogger } from '@/app/lib/logging/devLogger';
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
    throw new Error((json as { error?: string }).error || 'op push failed');
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
    this.callbacks.onBlocksUpdated(this.blocks, this.lastAppliedSeq);
    return this.blocks;
  }

  async syncWithServer(initialBlocks: NoteBlock[]): Promise<void> {
    const local = await readLocalDocument(this.documentId);
    const outbound = await listOutboundOps(this.documentId);

    // 서버 /blocks/load 스냅샷(initialBlocks)은 이미 모든 op가 반영된 materialized 상태.
    // 따라서 catch-up용 /ops/pull 재적용은 불필요(중복 API + 중복 apply)하다.
    // 현재 seq 하나만 알면 이후 push/pull 기준선이 잡힌다 → op-API 호출은 /ops/state 1회.
    const lastSeq = await fetchSyncState(this.documentId);

    // 아직 push 안 된 로컬 편집(오프라인 등)이 있으면 로컬 상태를 우선 표시하고,
    // flushPush로 서버에 반영해 병합한다. 그 외에는 서버 스냅샷이 권위 기준.
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
    // outbound(IndexedDB)는 탭 간 공유되므로, 리더 탭이 실제 push를 담당한다.
    // 비리더 탭에서의 편집은 리더에게 flush를 요청한다.
    if (this.isLeader) {
      this.schedulePush(delay);
    } else {
      this.requestLeaderFlush();
    }
  }

  schedulePull(): void {
    // Realtime는 모든 탭에서 발생하지만, 리더 탭만 delta pull하고
    // 결과를 BroadcastChannel state로 다른 탭에 전파한다(멀티탭 pull 폭증 방지).
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
    // Web Lock 해제 → 다른 탭이 리더 승계.
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

  /** 재진입 방지 + outbound가 빌 때까지 드레인. 리더 탭에서만 동작. */
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
          this.callbacks.onError?.(err);
          devLogger.error('[NoteSyncCoordinator] push failed', err);
          this.schedulePush(1000);
          break;
        }
      } while (this.pushRequested && !this.disposed);
    } finally {
      this.isPushing = false;
    }
  }

  /** outbound 1배치 push. 진행이 있었으면 true(더 있을 수 있음), 없으면 false. */
  private async pushBatchOnce(): Promise<boolean> {
    const outbound = await listOutboundOps(this.documentId);
    if (outbound.length === 0) return false;

    // 이번 스냅샷의 모든 op은 push되거나(coalesce 유지) 후속 op에 흡수(coalesce 탈락)되므로
    // 성공 시 통째로 제거한다. 이후 새로 append된 op은 이 스냅샷에 없어 안전하게 남는다.
    const consumedClientOpIds = outbound.map((op) => op.clientOpId);
    const ops = coalescePushItems(outbound.map(({ documentId: _d, createdAt: _c, ...op }) => op));

    let result = await pushOps(this.documentId, this.lastAppliedSeq, ops);
    if (!result.ok) {
      // 서버 seq가 앞섰음 → 원격 op 반영(rebase) 후 1회 재시도.
      await this.applyRemoteOps(result.ops, result.lastSeq);
      result = await pushOps(this.documentId, this.lastAppliedSeq, ops);
      if (!result.ok) {
        // 여전히 충돌(또 다른 동시 push) → 반영만 하고 잠시 후 재시도.
        await this.applyRemoteOps(result.ops, result.lastSeq);
        this.schedulePush(500);
        return false;
      }
    }

    this.blocks = mergeSnapshotPatches(this.blocks, result.blocks);
    this.lastAppliedSeq = result.lastSeq;
    await removeOutboundOps(consumedClientOpIds);
    await this.persistLocal();
    this.callbacks.onBlocksUpdated(this.blocks, this.lastAppliedSeq);
    this.broadcastState();
    return true;
  }

  private async pullRemote(): Promise<void> {
    try {
      const pulled = await pullOps(this.documentId, this.lastAppliedSeq);
      if (pulled.ops.length === 0 && pulled.lastSeq === this.lastAppliedSeq) return;
      await this.applyRemoteOps(pulled.ops, pulled.lastSeq);
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
          // 다른 탭의 편집을 리더가 대신 push한다.
          this.schedulePush(CONTENT_PUSH_DEBOUNCE_MS);
        }
      };
      this.leaderChannel.addEventListener('message', this.leaderListener);
    }

    // Web Locks: exclusive lock을 잡은 단일 탭만 리더. 리더 탭이 닫히면 잠금이 풀려
    // 대기 중인 다음 탭이 승계한다.
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
          // 리더가 되는 순간, 공유 outbound(다른 탭이 쌓아둔 것 포함)를 즉시 드레인.
          this.schedulePush(STRUCTURE_PUSH_DEBOUNCE_MS);
        }),
      ).catch(() => {
        // 잠금 획득 실패(경합/미지원) — 폴백으로 리더 처리.
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
