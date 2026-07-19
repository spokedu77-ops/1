import {
  dedupeNoteBlocksById,
  flattenVisualBlockIdsWithOptions,
} from '@/app/lib/note/noteBlockTree';
import { sanitizeNoteBlockTree } from '@/app/lib/note/noteBlockSanitize';
import type { NoteBlockFieldPatch } from './noteBlocksApi';
import { ensureNoteBlockVersion } from './noteBlockVersion';
import type { NoteCommand, NoteCommandContext, NoteCommandResult } from './noteCommand';
import { decideEmptySnapshotApply, decideStructureReconcile } from './noteAuthority';
import { mergeBlockContentWithStore } from './noteContentPatch';
import { applyRemoteOpRecords, mergeSnapshotPatches } from './noteOpReplay';
import {
  LOCAL_ONLY_BLOCK_GRACE_MS,
  mergeReconciledBlocks,
} from './noteBlockStateMerge';
import type { NoteBlock } from './types';

function cloneContent(content: unknown): unknown {
  if (content == null) return content;
  if (typeof content === 'object') {
    return { ...(content as Record<string, unknown>) };
  }
  return content;
}

function isEffectivelyEmptyHtml(value: unknown): boolean {
  if (typeof value !== 'string') return true;
  const stripped = value
    .replace(/<br\s*\/?>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
  return stripped.length === 0;
}

function hasVisibleBlockContent(block: NoteBlock): boolean {
  const content = (block.content ?? {}) as Record<string, unknown>;
  for (const key of ['text', 'title', 'body', 'caption', 'url', 'page_document_id']) {
    const value = content[key];
    if (typeof value === 'string' && value.trim().length > 0) return true;
  }
  if (!isEffectivelyEmptyHtml(content.html)) return true;
  return false;
}

function removeInactiveEmptyTodos(blocks: NoteBlock[], activeBlockId: string | null): NoteBlock[] {
  return blocks.filter((block) => {
    if (block.type !== 'todo') return true;
    if (block.id === activeBlockId) return true;
    return hasVisibleBlockContent(block);
  });
}

function filterDocumentBlocks(blocks: NoteBlock[], documentId: string): NoteBlock[] {
  const deduped = sanitizeNoteBlockTree(dedupeNoteBlocksById(
    blocks
      .filter((block) => block.document_id === documentId)
      .map(ensureNoteBlockVersion),
  ));
  const byId = new Map(deduped.map((block) => [block.id, block]));
  return flattenVisualBlockIdsWithOptions(deduped)
    .map((id) => byId.get(id))
    .filter((block): block is NoteBlock => Boolean(block));
}

function applyFieldPatches(
  blocks: NoteBlock[],
  patches: NoteBlockFieldPatch[],
): NoteBlock[] {
  if (patches.length === 0) return blocks;
  const patchMap = new Map(patches.map((patch) => [patch.id, patch]));
  return blocks.map((block) => {
    const patch = patchMap.get(block.id);
    if (!patch) return block;
    return ensureNoteBlockVersion({
      ...block,
      ...(patch.type !== undefined ? { type: patch.type } : {}),
      ...(patch.order_index !== undefined ? { order_index: patch.order_index } : {}),
      ...(patch.parent_block_id !== undefined
        ? { parent_block_id: patch.parent_block_id }
        : {}),
      ...(patch.document_id !== undefined ? { document_id: patch.document_id } : {}),
      ...(patch.content !== undefined ? { content: cloneContent(patch.content) } : {}),
    });
  });
}

/** remote apply 후 아직 서버에 없는 로컬-only 블록 유지 (생성 직후 grace) */
function unionLocalOnlyBlocks(
  previous: NoteBlock[],
  merged: NoteBlock[],
  documentId: string,
): NoteBlock[] {
  const mergedIds = new Set(merged.map((block) => block.id));
  const now = Date.now();
  const localOnly = previous.filter((block) => {
    if (block.document_id !== documentId || mergedIds.has(block.id)) return false;
    if (!block.created_at) return false;
    const createdAt = new Date(block.created_at).getTime();
    if (!Number.isFinite(createdAt)) return false;
    return now - createdAt <= LOCAL_ONLY_BLOCK_GRACE_MS;
  });
  if (localOnly.length === 0) return merged;
  return dedupeNoteBlocksById([...merged, ...localOnly]);
}

/** active editor·store content를 incoming 위에 병합 */
function preserveStoreContent(
  blocks: NoteBlock[],
  ctx: NoteCommandContext,
): NoteBlock[] {
  return blocks.map((block) => {
    const fromStore = ctx.storeContentById[block.id];
    if (!fromStore) return block;
    if (block.id === ctx.activeBlockId || fromStore !== block.content) {
      const merged = mergeBlockContentWithStore(
        block.content as Record<string, unknown> | null | undefined,
        fromStore,
      );
      if (!merged || merged === block.content) return block;
      return { ...block, content: merged };
    }
    return block;
  });
}

function resolveStructureAuthority(
  localBlocks: NoteBlock[],
  incomingBlocks: NoteBlock[],
  ctx: NoteCommandContext,
): 'local' | 'incoming' {
  if (ctx.activeBlockId !== null && wouldReconcileRegressLocalPosition(localBlocks, incomingBlocks)) {
    return 'local';
  }
  const decision = decideStructureReconcile({
    localBlocks,
    incomingBlocks,
    hasUnpublishedTopology: ctx.hasUnpublishedTopology === true,
  });
  return decision === 'preserve_local' ? 'local' : 'incoming';
}

function wouldReconcileRegressLocalPosition(
  localBlocks: NoteBlock[],
  incomingBlocks: NoteBlock[],
): boolean {
  const localById = new Map(localBlocks.map((block) => [block.id, block]));
  return incomingBlocks.some((block) => {
    const local = localById.get(block.id);
    if (!local) return false;
    return (local.parent_block_id ?? null) !== (block.parent_block_id ?? null)
      || local.order_index !== block.order_index;
  });
}

function preserveExistingLocalPositions(
  localBlocks: NoteBlock[],
  incomingBlocks: NoteBlock[],
): NoteBlock[] {
  const localById = new Map(localBlocks.map((block) => [block.id, block]));
  return incomingBlocks.map((block) => {
    const local = localById.get(block.id);
    if (!local) return block;
    return {
      ...block,
      parent_block_id: local.parent_block_id ?? null,
      order_index: local.order_index,
    };
  });
}

function sortBlocksForVisualOrder(blocks: NoteBlock[]): NoteBlock[] {
  const byId = new Map(blocks.map((block) => [block.id, block]));
  return flattenVisualBlockIdsWithOptions(blocks)
    .map((id) => byId.get(id))
    .filter((block): block is NoteBlock => Boolean(block));
}

/**
 * 순수 reducer — API·React·Zustand와 분리.
 * 모든 블록 상태 전이는 이 함수만 통과한다.
 */
export function applyNoteCommand(
  previous: NoteBlock[],
  command: NoteCommand,
  ctx: NoteCommandContext,
): NoteCommandResult {
  const docBlocks = removeInactiveEmptyTodos(
    filterDocumentBlocks(previous, ctx.documentId),
    ctx.activeBlockId,
  );

  switch (command.type) {
  case 'hydrate': {
    const incoming = removeInactiveEmptyTodos(
      filterDocumentBlocks(command.blocks, ctx.documentId),
      ctx.activeBlockId,
    );
    if (incoming.length === 0 && docBlocks.length > 0) {
      const emptyDecision = decideEmptySnapshotApply({
        localBlocks: docBlocks,
        incomingBlocks: incoming,
        emptyConfirmed: command.emptyConfirmed === true,
        pendingLeaveIds: ctx.pendingLeaveIds,
      });
      if (emptyDecision === 'reject_race_wipe') {
        return { blocks: docBlocks, structural: false };
      }
      return { blocks: [], structural: true };
    }
    let next = mergeReconciledBlocks(
      docBlocks,
      incoming,
      { structureAuthority: resolveStructureAuthority(docBlocks, incoming, ctx) },
    );
    next = unionLocalOnlyBlocks(docBlocks, next, ctx.documentId);
    next = preserveStoreContent(next, ctx);
    return { blocks: next, structural: true };
  }
  case 'replaceBlocks': {
    const blocks = removeInactiveEmptyTodos(
      filterDocumentBlocks(command.blocks, ctx.documentId),
      ctx.activeBlockId,
    );
    return { blocks, structural: true };
  }
  case 'patchContent': {
    const blocks = docBlocks.map((block) => {
      if (block.id !== command.blockId) return block;
      return ensureNoteBlockVersion({
        ...block,
        content: cloneContent(command.content),
      });
    });
    return { blocks, structural: false };
  }
  case 'applyPatches': {
    return {
      blocks: applyFieldPatches(docBlocks, command.patches),
      structural: true,
    };
  }
  case 'applyRemoteOps': {
    let next = applyRemoteOpRecords(docBlocks, command.ops);
    next = removeInactiveEmptyTodos(next, ctx.activeBlockId);
    next = mergeReconciledBlocks(
      docBlocks,
      next,
      { structureAuthority: resolveStructureAuthority(docBlocks, next, ctx) },
    );
    next = unionLocalOnlyBlocks(docBlocks, next, ctx.documentId);
    next = preserveStoreContent(next, ctx);
    return { blocks: next, structural: true };
  }
  case 'mergeSnapshots': {
    let next = mergeSnapshotPatches(docBlocks, command.snapshots);
    next = removeInactiveEmptyTodos(next, ctx.activeBlockId);
    next = unionLocalOnlyBlocks(docBlocks, next, ctx.documentId);
    next = preserveStoreContent(next, ctx);
    return { blocks: next, structural: true };
  }
  case 'syncSnapshot': {
    let incoming = removeInactiveEmptyTodos(
      filterDocumentBlocks(command.blocks, ctx.documentId),
      ctx.activeBlockId,
    );
    if (incoming.length === 0 && docBlocks.length > 0) {
      const emptyDecision = decideEmptySnapshotApply({
        localBlocks: docBlocks,
        incomingBlocks: incoming,
        emptyConfirmed: command.emptyConfirmed === true,
        pendingLeaveIds: ctx.pendingLeaveIds,
      });
      if (emptyDecision === 'reject_race_wipe') {
        return { blocks: docBlocks, structural: false };
      }
      return { blocks: [], structural: true };
    }
    incoming = sortBlocksForVisualOrder(preserveExistingLocalPositions(docBlocks, incoming));
    let next = mergeReconciledBlocks(
      docBlocks,
      incoming,
      { structureAuthority: resolveStructureAuthority(docBlocks, incoming, ctx) },
    );
    next = unionLocalOnlyBlocks(docBlocks, next, ctx.documentId);
    next = preserveStoreContent(next, ctx);
    return { blocks: next, structural: true };
  }
  default: {
    const _exhaustive: never = command;
    return _exhaustive;
  }
  }
}
