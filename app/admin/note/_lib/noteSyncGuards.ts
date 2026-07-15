import type { NoteBlockOpPushItem } from '@/app/lib/note/noteBlockOpTypes';

/** op-log create는 클라이언트 UUID가 서버 id와 같아야 한다. */
export function newNoteBlockClientId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `block-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** transport가 해석하는 편집 op 등급 — 기능명이 아니라 틀 계약 */
export type NoteBlockOpKind =
  | 'presence'
  | 'content'
  | 'topology'
  | 'identityLeave'
  | 'relocation'
  | 'mixed';

function patchLeavesDocument(patch: { document_id?: string }): boolean {
  return typeof patch.document_id === 'string' && patch.document_id.length > 0;
}

export function classifyPushItem(item: NoteBlockOpPushItem): NoteBlockOpKind {
  const payload = item.payload;
  switch (payload.opType) {
  case 'create_block':
    return 'presence';
  case 'patch_content':
    return 'content';
  case 'soft_delete':
  case 'purge_block':
    return 'identityLeave';
  case 'patch_fields': {
    const leave = payload.patches.some(patchLeavesDocument);
    const stay = payload.patches.some((patch) => !patchLeavesDocument(patch));
    if (leave && stay) return 'mixed';
    if (leave) return 'relocation';
    return 'topology';
  }
  case 'block_transaction': {
    const hasCreate = (payload.creates?.length ?? 0) > 0;
    const hasDelete = payload.deleteIds.length > 0;
    const leave = payload.patches.some(patchLeavesDocument);
    const stay = payload.patches.some((patch) => !patchLeavesDocument(patch));
    const kinds = new Set<NoteBlockOpKind>();
    if (hasCreate) kinds.add('presence');
    if (hasDelete) kinds.add('identityLeave');
    if (leave) kinds.add('relocation');
    if (stay) kinds.add('topology');
    if (kinds.size === 0) return 'topology';
    if (kinds.size === 1) return [...kinds][0]!;
    return 'mixed';
  }
  default: {
    const _exhaustive: never = payload;
    return _exhaustive;
  }
  }
}

/** identityLeave·relocation — 로컬 활성 목록에 id가 없어도 push되어야 하는 op */
export function isIdentityLeaveOrRelocationPush(item: NoteBlockOpPushItem): boolean {
  const kind = classifyPushItem(item);
  return kind === 'identityLeave' || kind === 'relocation' || kind === 'mixed';
}

/** inactive drain용 — mixed(topology/create 포함)는 제외하고 pure leave만 */
export function isPureIdentityLeaveOrRelocationPush(item: NoteBlockOpPushItem): boolean {
  const kind = classifyPushItem(item);
  return kind === 'identityLeave' || kind === 'relocation';
}

export function outboundHasIdentityLeaveOrRelocation(
  items: ReadonlyArray<NoteBlockOpPushItem>,
): boolean {
  return items.some(isIdentityLeaveOrRelocationPush);
}

export function outboundHasPureIdentityLeaveOrRelocation(
  items: ReadonlyArray<NoteBlockOpPushItem>,
): boolean {
  return items.some(isPureIdentityLeaveOrRelocationPush);
}

/** 미ack outbound에 same-doc 구조 변경(presence/topology/mixed)이 있는지 */
export function outboundHasUnpublishedTopology(
  items: ReadonlyArray<NoteBlockOpPushItem>,
): boolean {
  return items.some((item) => {
    const kind = classifyPushItem(item);
    return kind === 'topology' || kind === 'presence' || kind === 'mixed';
  });
}

function collectCreateIdsFromOutbound(
  outbound: ReadonlyArray<NoteBlockOpPushItem>,
): Set<string> {
  const ids = new Set<string>();
  for (const item of outbound) {
    const payload = item.payload;
    if (payload.opType === 'create_block' && payload.id) {
      ids.add(payload.id);
      continue;
    }
    if (payload.opType === 'block_transaction' && payload.creates) {
      for (const create of payload.creates) {
        if (create.id) ids.add(create.id);
      }
    }
  }
  return ids;
}

/**
 * content/topology만 known(로컬·create)을 요구한다.
 * identityLeave·relocation은 로컬에서 이미 빠진 뒤가 정상이므로 store presence를 요구하지 않는다.
 * 다만 아직 미전송 create인 id에 대한 leave만 create 뒤로 defer.
 */
function requiredKnownIdsForPush(
  item: NoteBlockOpPushItem,
  createIdsInOutbound: ReadonlySet<string>,
  known: ReadonlySet<string>,
): string[] {
  const payload = item.payload;
  switch (payload.opType) {
  case 'patch_content':
    return [payload.blockId];
  case 'create_block':
    return [];
  case 'soft_delete':
    return payload.ids.filter((id) => createIdsInOutbound.has(id) && !known.has(id));
  case 'purge_block':
    return createIdsInOutbound.has(payload.id) && !known.has(payload.id)
      ? [payload.id]
      : [];
  case 'patch_fields':
    // relocation(document_id)은 leave — known 불요. same-doc topology만 요구.
    return payload.patches
      .filter((patch) => !patchLeavesDocument(patch))
      .map((patch) => patch.id);
  case 'block_transaction': {
    const topologyIds = payload.patches
      .filter((patch) => !patchLeavesDocument(patch))
      .map((patch) => patch.id);
    const leaveWaitingCreate = payload.deleteIds.filter(
      (id) => createIdsInOutbound.has(id) && !known.has(id),
    );
    return [...topologyIds, ...leaveWaitingCreate];
  }
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
 * push 배치에서 content/topology가 create보다 앞서지 않게 한다.
 * identityLeave·relocation은 활성 목록 부재를 정상으로 본다.
 */
/**
 * 로컬 활성 집합의 id.
 * outbound create는 partition 루프에서 ready 되는 순간에만 known에 올린다.
 * (미리 올리면 identityLeave가 create보다 앞서 push될 수 있음)
 */
export function buildKnownBlockIdsForPush(
  blocks: ReadonlyArray<{ id: string }>,
  _outbound?: ReadonlyArray<NoteBlockOpPushItem>,
): Set<string> {
  void _outbound;
  return new Set(blocks.map((block) => block.id));
}

export function partitionOutboundForSafePush(
  items: NoteBlockOpPushItem[],
  knownBlockIds: ReadonlySet<string>,
): { ready: NoteBlockOpPushItem[]; deferred: NoteBlockOpPushItem[] } {
  const known = new Set(knownBlockIds);
  const createIdsInOutbound = collectCreateIdsFromOutbound(items);
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

    const requiredIds = requiredKnownIdsForPush(item, createIdsInOutbound, known);
    if (requiredIds.some((id) => !known.has(id))) {
      deferred.push(item);
      continue;
    }

    ready.push(item);
    registerCreatesFromPush(item, known);
  }

  return { ready, deferred };
}
