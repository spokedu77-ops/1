import type { NoteBlockFieldPatch } from './noteBlocksApi';
import type { NoteBlock } from './types';

/** 문서 편집 연산 — 로컬 reducer가 처리하는 단위 */
export type NoteDocumentOp =
  | { type: 'replaceBlocks'; blocks: NoteBlock[] }
  | { type: 'updateContent'; blockId: string; content: Record<string, unknown> }
  | { type: 'applyPatches'; patches: NoteBlockFieldPatch[] }
  | { type: 'syncFromServer'; blocks: NoteBlock[] };

/** 서버에 순차 반영할 영속 연산 */
export type NotePersistOp =
  | { type: 'patchContent'; updates: Array<{ id: string; content: Record<string, unknown> }> }
  | { type: 'patchFields'; patches: NoteBlockFieldPatch[] }
  | {
    type: 'reorderBlocks';
    orders: Array<{ id: string; order_index: number }>;
    fieldPatches?: NoteBlockFieldPatch[];
  }
  | { type: 'softDelete'; ids: string[] }
  | {
    type: 'createBlock';
    documentId: string;
    blockType: NoteBlock['type'];
    content: Record<string, unknown>;
    order_index?: number;
    parent_block_id: string | null;
    normalizeOrders?: Array<{ id: string; order_index: number }>;
  }
  | { type: 'transferBlocks'; patches: NoteBlockFieldPatch[] }
  /** @deprecated Use blockTransaction. */
  | { type: 'transferBlocks'; patches: NoteBlockFieldPatch[] }
  | {
    type: 'blockTransaction';
    patches: NoteBlockFieldPatch[];
    deleteIds: string[];
  }
  | { type: 'purgeBlock'; id: string };

export type NoteDocumentEngineState = {
  documentId: string;
  blocks: NoteBlock[];
};
