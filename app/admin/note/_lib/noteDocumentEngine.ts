import { dedupeNoteBlocksById } from '@/app/lib/note/noteBlockTree';
import type { NoteBlockFieldPatch } from './noteBlocksApi';
import { ensureNoteBlockVersion } from './noteBlockVersion';
import type { NoteDocumentEngineState, NoteDocumentOp } from './noteDocumentOps';
import type { NoteBlock } from './types';

export function createNoteDocumentEngineState(
  documentId: string,
  blocks: NoteBlock[] = [],
): NoteDocumentEngineState {
  return {
    documentId,
    blocks: dedupeNoteBlocksById(blocks.map(ensureNoteBlockVersion)),
  };
}

function cloneContent(content: unknown): unknown {
  if (content == null) return content;
  if (typeof content === 'object') {
    return { ...(content as Record<string, unknown>) };
  }
  return content;
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
      ...(patch.content !== undefined ? { content: cloneContent(patch.content) } : {}),
    });
  });
}

function syncBlocksFromServer(
  blocks: NoteBlock[],
  serverBlocks: NoteBlock[],
  activeBlockId: string | null,
): NoteBlock[] {
  if (serverBlocks.length === 0) return blocks;
  const serverMap = new Map(serverBlocks.map((block) => [block.id, ensureNoteBlockVersion(block)]));
  return blocks.filter((block) => !serverMap.get(block.id)?.deleted_at).map((block) => {
    const server = serverMap.get(block.id);
    if (!server) return block;
    if (block.id === activeBlockId) {
      return ensureNoteBlockVersion({
        ...block,
        version: server.version,
        updated_at: server.updated_at,
      });
    }
    return ensureNoteBlockVersion({
      ...block,
      ...server,
      content: server.content ?? block.content,
    });
  });
}

/** 순수 reducer — API·React·스토어와 분리 */
export function applyNoteDocumentOp(
  state: NoteDocumentEngineState,
  op: NoteDocumentOp,
  options?: { activeBlockId?: string | null },
): NoteDocumentEngineState {
  switch (op.type) {
    case 'replaceBlocks': {
      const blocks = dedupeNoteBlocksById(
        op.blocks
          .filter((block) => block.document_id === state.documentId)
          .map(ensureNoteBlockVersion),
      );
      return { ...state, blocks };
    }
    case 'updateContent': {
      const blocks = state.blocks.map((block) => {
        if (block.id !== op.blockId) return block;
        return ensureNoteBlockVersion({
          ...block,
          content: cloneContent(op.content),
        });
      });
      return { ...state, blocks };
    }
    case 'applyPatches': {
      return {
        ...state,
        blocks: applyFieldPatches(state.blocks, op.patches),
      };
    }
    case 'syncFromServer': {
      return {
        ...state,
        blocks: syncBlocksFromServer(
          state.blocks,
          op.blocks,
          options?.activeBlockId ?? null,
        ),
      };
    }
    default: {
      const _exhaustive: never = op;
      return _exhaustive;
    }
  }
}

export function applyServerBlockVersions(
  blocks: NoteBlock[],
  patched: Array<Pick<NoteBlock, 'id' | 'version' | 'updated_at'>>,
): NoteBlock[] {
  if (patched.length === 0) return blocks;
  const versionMap = new Map(patched.map((block) => [block.id, block]));
  return blocks.map((block) => {
    const server = versionMap.get(block.id);
    if (!server) return block;
    return ensureNoteBlockVersion({
      ...block,
      version: server.version,
      updated_at: server.updated_at,
    });
  });
}

export function getEngineBlock(
  state: NoteDocumentEngineState,
  blockId: string,
): NoteBlock | undefined {
  return state.blocks.find((block) => block.id === blockId);
}
