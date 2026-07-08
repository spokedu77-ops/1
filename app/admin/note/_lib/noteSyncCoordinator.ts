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
const LEADER_LEASE_MS = 4000;

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

  private leaderTimer: ReturnType<typeof setInterval> | null = null;

  private leaderChannel: BroadcastChannel | null = null;

  private leaderListener: ((event: MessageEvent) => void) | null = null;

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
    if (options?.immediate || op.type !== 'patchContent') {
      this.schedulePush(STRUCTURE_PUSH_DEBOUNCE_MS);
      return;
    }
    this.schedulePush(CONTENT_PUSH_DEBOUNCE_MS);
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
    if (this.pushTimer) clearTimeout(this.pushTimer);
    if (this.leaderTimer) clearInterval(this.leaderTimer);
    if (this.leaderChannel && this.leaderListener) {
      this.leaderChannel.removeEventListener('message', this.leaderListener);
      this.leaderChannel.close();
    }
    this.leaderChannel = null;
    this.leaderListener = null;
    this.isLeader = false;
  }

  private schedulePush(delayMs: number): void {
    if (this.pushTimer) clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => {
      this.pushTimer = null;
      void this.flushPush();
    }, delayMs);
  }

  private async flushPush(): Promise<void> {
    if (!this.isLeader) return;
    try {
      const outbound = await listOutboundOps(this.documentId);
      if (outbound.length === 0) return;

      // 이번 flush 스냅샷의 모든 op은 push되거나(coalesce 유지) 후속 op에 흡수(coalesce 탈락)되므로
      // 모두 "소비된" 것으로 간주해 성공 시 통째로 제거한다. flush 이후 새로 append된 op은
      // 이 스냅샷에 없으므로 안전하게 남는다.
      const consumedClientOpIds = outbound.map((op) => op.clientOpId);
      const ops = coalescePushItems(outbound.map(({ documentId: _d, createdAt: _c, ...op }) => op));
      let baseSeq = this.lastAppliedSeq;
      let result = await pushOps(this.documentId, baseSeq, ops);

      if (!result.ok) {
        await this.applyRemoteOps(result.ops, result.lastSeq);
        baseSeq = this.lastAppliedSeq;
        result = await pushOps(this.documentId, baseSeq, ops);
        if (!result.ok) {
          throw new Error('seq_conflict after replay');
        }
      }

      if (result.ok) {
        this.blocks = mergeSnapshotPatches(this.blocks, result.blocks);
        this.lastAppliedSeq = result.lastSeq;
        await removeOutboundOps(consumedClientOpIds);
        await this.persistLocal();
        this.callbacks.onBlocksUpdated(this.blocks, this.lastAppliedSeq);
        this.broadcastState();
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.callbacks.onError?.(err);
      devLogger.error('[NoteSyncCoordinator] push failed', err);
    }
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

  private startLeaderElection(): void {
    if (typeof BroadcastChannel === 'undefined') {
      this.isLeader = true;
      return;
    }
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
      if (data.type === 'state' && Array.isArray(data.blocks)) {
        this.blocks = data.blocks;
        this.lastAppliedSeq = typeof data.lastSeq === 'number' ? data.lastSeq : this.lastAppliedSeq;
        void this.persistLocal();
        this.callbacks.onBlocksUpdated(this.blocks, this.lastAppliedSeq);
      }
      if (data.type === 'leader_ping' && data.tabId !== getTabInstanceId()) {
        this.isLeader = false;
      }
    };
    this.leaderChannel.addEventListener('message', this.leaderListener);

    const claim = () => {
      this.isLeader = true;
      this.leaderChannel?.postMessage({
        type: 'leader_ping',
        documentId: this.documentId,
        tabId: getTabInstanceId(),
      });
    };
    claim();
    this.leaderTimer = setInterval(claim, LEADER_LEASE_MS);
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
