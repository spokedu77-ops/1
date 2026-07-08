import { normalizeNoteBlockVersion } from './noteBlockVersion';
import type { NoteBlock } from './types';

const CHANNEL_NAME = 'spm-note-block-sync-v1';

let tabInstanceId: string | null = null;

function getTabInstanceId(): string {
  if (!tabInstanceId) {
    tabInstanceId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  return tabInstanceId;
}

export type NoteCrossTabVersionBlock = Pick<NoteBlock, 'id' | 'updated_at'> & {
  version: number;
};

export type NoteCrossTabBlockSyncMessage = {
  tabId: string;
  documentId: string;
  blocks: NoteCrossTabVersionBlock[];
};

function normalizeCrossTabVersionBlocks(
  blocks: Array<Pick<NoteBlock, 'id' | 'updated_at'> & { version?: number }>,
): NoteCrossTabVersionBlock[] {
  return blocks.map((block) => ({
    id: block.id,
    updated_at: block.updated_at,
    version: normalizeNoteBlockVersion(block.version),
  }));
}

/** 저장 탭 → 다른 탭: version만 즉시 맞춰 409 재시도·reconcile 폭주를 줄인다 */
export function broadcastNoteBlockVersions(
  documentId: string,
  blocks: Array<Pick<NoteBlock, 'id' | 'updated_at'> & { version?: number }>,
): void {
  const normalized = normalizeCrossTabVersionBlocks(blocks);
  if (typeof BroadcastChannel === 'undefined' || normalized.length === 0) return;
  const channel = new BroadcastChannel(CHANNEL_NAME);
  try {
    channel.postMessage({
      tabId: getTabInstanceId(),
      documentId,
      blocks: normalized,
    } satisfies NoteCrossTabBlockSyncMessage);
  } finally {
    channel.close();
  }
}

export function subscribeNoteCrossTabBlockSync(
  handler: (message: NoteCrossTabBlockSyncMessage) => void,
): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => {};
  const channel = new BroadcastChannel(CHANNEL_NAME);
  const listener = (event: MessageEvent<NoteCrossTabBlockSyncMessage>) => {
    const message = event.data;
    if (!message?.documentId || message.tabId === getTabInstanceId()) return;
    if (!Array.isArray(message.blocks) || message.blocks.length === 0) return;
    handler(message);
  };
  channel.addEventListener('message', listener);
  return () => {
    channel.removeEventListener('message', listener);
    channel.close();
  };
};
