import type { NoteBlock } from './types';
import type { NoteBlockOpRecord, NoteBlockSnapshot } from '@/app/lib/note/noteBlockOpTypes';
import { ensureNoteBlockVersion } from './noteBlockVersion';
import { dedupeNoteBlocksById } from '@/app/lib/note/noteBlockTree';

export function snapshotToNoteBlock(snapshot: NoteBlockSnapshot): NoteBlock {
  return ensureNoteBlockVersion({
    id: snapshot.id,
    document_id: snapshot.document_id,
    parent_block_id: snapshot.parent_block_id,
    type: snapshot.type,
    order_index: snapshot.order_index,
    content: snapshot.content ?? {},
    created_at: snapshot.updated_at,
    updated_at: snapshot.updated_at,
    deleted_at: snapshot.deleted_at ?? null,
    version: snapshot.version,
  });
}

export function snapshotsToNoteBlocks(snapshots: NoteBlockSnapshot[]): NoteBlock[] {
  return dedupeNoteBlocksById(snapshots.map(snapshotToNoteBlock));
}

export function applyRemoteOpRecords(
  blocks: NoteBlock[],
  ops: NoteBlockOpRecord[],
): NoteBlock[] {
  let next = blocks;
  for (const op of ops) {
    next = applyRemoteOpRecord(next, op);
  }
  return dedupeNoteBlocksById(next);
}

function applyRemoteOpRecord(blocks: NoteBlock[], op: NoteBlockOpRecord): NoteBlock[] {
  const payload = op.payload;
  switch (payload.opType) {
  case 'patch_content': {
    return blocks.map((block) => {
      if (block.id !== payload.blockId) return block;
      return ensureNoteBlockVersion({
        ...block,
        content: payload.content,
        updated_at: op.createdAt,
      });
    });
  }
  case 'patch_fields': {
    const patchMap = new Map(payload.patches.map((patch) => [patch.id, patch]));
    return blocks.map((block) => {
      const patch = patchMap.get(block.id);
      if (!patch) return block;
      return ensureNoteBlockVersion({
        ...block,
        ...(patch.type !== undefined ? { type: patch.type } : {}),
        ...(patch.order_index !== undefined ? { order_index: patch.order_index } : {}),
        ...(patch.parent_block_id !== undefined ? { parent_block_id: patch.parent_block_id } : {}),
        ...(patch.document_id !== undefined ? { document_id: patch.document_id } : {}),
        ...(patch.content !== undefined ? { content: patch.content } : {}),
        updated_at: op.createdAt,
      });
    });
  }
  case 'soft_delete': {
    // 활성 블록 집합에서 제거 (deleted_at 잔류 = Project 좀비)
    const idSet = new Set(payload.ids);
    return blocks.filter((block) => !idSet.has(block.id));
  }
  case 'create_block': {
    const id = payload.id ?? crypto.randomUUID();
    const created = ensureNoteBlockVersion({
      id,
      document_id: payload.documentId,
      parent_block_id: payload.parent_block_id,
      type: payload.blockType,
      order_index: payload.order_index ?? 0,
      content: payload.content,
      created_at: op.createdAt,
      updated_at: op.createdAt,
    });
    let next = [...blocks, created];
    if (payload.normalizeOrders?.length) {
      const orderMap = new Map(payload.normalizeOrders.map((item) => [item.id, item.order_index]));
      next = next.map((block) => {
        const order = orderMap.get(block.id);
        if (order === undefined) return block;
        return { ...block, order_index: order };
      });
    }
    if (payload.transactionUpdates?.length) {
      next = applyRemoteOpRecords(next, [{
        ...op,
        payload: { opType: 'patch_fields', patches: payload.transactionUpdates },
      }]);
    }
    return next;
  }
  case 'block_transaction': {
    let next = blocks;
    if (payload.patches.length > 0) {
      next = applyRemoteOpRecord(next, {
        ...op,
        payload: { opType: 'patch_fields', patches: payload.patches },
      });
    }
    if (payload.deleteIds.length > 0) {
      next = applyRemoteOpRecord(next, {
        ...op,
        payload: { opType: 'soft_delete', ids: payload.deleteIds },
      });
    }
    if (payload.creates?.length) {
      for (const create of payload.creates) {
        next = applyRemoteOpRecord(next, {
          ...op,
          payload: {
            opType: 'create_block',
            id: create.id,
            documentId: create.document_id,
            blockType: create.type,
            content: create.content as Record<string, unknown>,
            order_index: create.order_index,
            parent_block_id: create.parent_block_id,
          },
        });
      }
    }
    return next;
  }
  case 'purge_block': {
    return blocks.filter((block) => block.id !== payload.id);
  }
  default: {
    const _exhaustive: never = payload;
    return _exhaustive;
  }
  }
}

export function mergeSnapshotPatches(
  blocks: NoteBlock[],
  snapshots: NoteBlockSnapshot[],
  options?: { excludeBlockIds?: Set<string> },
): NoteBlock[] {
  if (snapshots.length === 0) return blocks;
  const exclude = options?.excludeBlockIds;
  const map = new Map(snapshots.map((snapshot) => [snapshot.id, snapshot]));
  const seen = new Set<string>();
  const next: NoteBlock[] = [];
  for (const block of blocks) {
    const snapshot = map.get(block.id);
    if (!snapshot) {
      next.push(block);
      continue;
    }
    if (exclude?.has(block.id)) {
      next.push(block);
      continue;
    }
    seen.add(block.id);
    if (snapshot.deleted_at) {
      // identityLeave ack — 활성 집합에서 drop
      continue;
    }
    next.push(ensureNoteBlockVersion({
      ...snapshotToNoteBlock(snapshot),
      content: block.content ?? snapshot.content ?? {},
    }));
  }
  for (const snapshot of snapshots) {
    if (seen.has(snapshot.id)) continue;
    if (snapshot.deleted_at) continue;
    if (exclude?.has(snapshot.id)) continue;
    next.push(snapshotToNoteBlock(snapshot));
  }
  return dedupeNoteBlocksById(next);
}
