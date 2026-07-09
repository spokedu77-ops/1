import type { NoteBlockOpPushItem } from '@/app/lib/note/noteBlockOpTypes';

/** op-log create는 클라이언트 UUID가 서버 id와 같아야 한다. */
export function newNoteBlockClientId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `block-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function requiredBlockIdsForPush(item: NoteBlockOpPushItem): string[] {
  const payload = item.payload;
  switch (payload.opType) {
  case 'patch_content':
    return [payload.blockId];
  case 'create_block':
    return payload.id ? [payload.id] : [];
  case 'patch_fields':
    return payload.patches.map((patch) => patch.id);
  case 'soft_delete':
    return payload.ids;
  case 'block_transaction':
    return [
      ...payload.patches.map((patch) => patch.id),
      ...(payload.creates?.map((create) => create.id).filter((id): id is string => !!id) ?? []),
    ];
  case 'purge_block':
    return [payload.id];
  default: {
    const _exhaustive: never = payload;
    return _exhaustive;
  }
  }
}

function registerCreatesFromPush(
  item: NoteBlockOpPushItem,
  known: Set<string>,
): void {
  const payload = item.payload;
  if (payload.opType === 'create_block' && payload.id) {
    known.add(payload.id);
    return;
  }
  if (payload.opType === 'block_transaction' && payload.creates) {
    for (const create of payload.creates) {
      if (create.id) known.add(create.id);
    }
  }
}

/**
 * push 배치에서 서버에 아직 없는 블록을 건드리는 op는 뒤로 미룬다.
 * create → patch 순서가 깨져도 block not found가 나지 않게 한다.
 */
export function partitionOutboundForSafePush(
  items: NoteBlockOpPushItem[],
  knownBlockIds: ReadonlySet<string>,
): { ready: NoteBlockOpPushItem[]; deferred: NoteBlockOpPushItem[] } {
  const known = new Set(knownBlockIds);
  const ready: NoteBlockOpPushItem[] = [];
  const deferred: NoteBlockOpPushItem[] = [];

  for (const item of items) {
    const payload = item.payload;

    if (payload.opType === 'create_block') {
      if (!payload.id) {
        deferred.push(item);
        continue;
      }
      ready.push(item);
      registerCreatesFromPush(item, known);
      continue;
    }

    const requiredIds = requiredBlockIdsForPush(item);
    if (requiredIds.length === 0 || requiredIds.some((id) => !known.has(id))) {
      deferred.push(item);
      continue;
    }

    ready.push(item);
    registerCreatesFromPush(item, known);
  }

  return { ready, deferred };
}
