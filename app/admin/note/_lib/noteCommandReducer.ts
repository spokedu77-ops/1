import { dedupeNoteBlocksById } from '@/app/lib/note/noteBlockTree';
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

function filterDocumentBlocks(blocks: NoteBlock[], documentId: string): NoteBlock[] {
  return dedupeNoteBlocksById(
    blocks
      .filter((block) => block.document_id === documentId)
      .map(ensureNoteBlockVersion),
  );
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
  const decision = decideStructureReconcile({
    localBlocks,
    incomingBlocks,
    hasUnpublishedTopology: ctx.hasUnpublishedTopology === true,
  });
  return decision === 'preserve_local' ? 'local' : 'incoming';
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
  const docBlocks = filterDocumentBlocks(previous, ctx.documentId);

  switch (command.type) {
  case 'hydrate': {
    const incoming = filterDocumentBlocks(command.blocks, ctx.documentId);
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
    const blocks = filterDocumentBlocks(command.blocks, ctx.documentId);
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
    next = unionLocalOnlyBlocks(docBlocks, next, ctx.documentId);
    next = preserveStoreContent(next, ctx);
    return { blocks: next, structural: true };
  }
  case 'syncSnapshot': {
    const incoming = filterDocumentBlocks(command.blocks, ctx.documentId);
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
  default: {
    const _exhaustive: never = command;
    return _exhaustive;
  }
  }
}
