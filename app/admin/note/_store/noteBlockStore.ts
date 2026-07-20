'use client';

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { clearAllDocumentPreviewCrossHighlights } from '../_components/noteBlockPreviewCrossSelect';
import { commitActiveNoteEditorToStore } from '../_lib/noteBlockStateMerge';
import {
  contentChangedForUndo,
  mergeBlockContentWithStore,
} from '../_lib/noteContentPatch';
import { getStructuralExcludeIds } from '../_lib/noteStructuralExcludeRegistry';
import type { NoteTableCellField } from '../_lib/noteTableBlock';
import type { NoteBlock } from '../_lib/types';

export type NoteActiveEditorField = 'text' | NoteTableCellField;

export type NoteActiveEditor = {
  blockId: string;
  field: NoteActiveEditorField;
};

export type NoteBlockStoreState = {
  byId: Record<string, NoteBlock>;
  order: string[];
  activeDocumentId: string | null;
  activeEditor: NoteActiveEditor | null;
  hydrate: (blocks: NoteBlock[]) => void;
  replaceBlocks: (blocks: NoteBlock[]) => void;
  applyBlocks: (updater: (blocks: NoteBlock[]) => NoteBlock[]) => NoteBlock[];
  syncBlocksStructure: (blocks: NoteBlock[]) => void;
  patchContent: (blockId: string, content: Record<string, unknown>) => void;
  upsertBlock: (block: NoteBlock) => void;
  removeBlock: (blockId: string) => void;
  setActiveEditor: (active: NoteActiveEditor | null) => void;
  setActiveDocumentId: (documentId: string | null) => void;
  getBlock: (blockId: string) => NoteBlock | undefined;
  getBlocksArray: () => NoteBlock[];
};

function excludePendingDeletes(
  blocks: NoteBlock[],
  documentId: string | null,
): NoteBlock[] {
  if (!documentId || blocks.length === 0) return blocks;
  const pending = getStructuralExcludeIds(documentId);
  if (pending.size === 0) return blocks;
  return blocks.filter((block) => !pending.has(block.id));
}

type ActiveEditorPreserveState = Pick<
  NoteBlockStoreState,
  'activeDocumentId' | 'activeEditor' | 'byId'
>;

function preserveActiveEditorContent(
  block: NoteBlock,
  state: ActiveEditorPreserveState,
): NoteBlock {
  if (state.activeEditor?.blockId !== block.id) return block;
  const prev = state.byId[block.id];
  if (!prev || prev.type !== block.type || prev.content == null) return block;
  if (state.activeDocumentId && prev.document_id !== state.activeDocumentId) return block;

  const merged = mergeBlockContentWithStore(
    block.content as Record<string, unknown> | null | undefined,
    prev.content as Record<string, unknown>,
  );
  return {
    ...block,
    content: merged ?? prev.content,
  };
}

function blocksToByIdPreservingActiveEditor(
  blocks: NoteBlock[],
  state: ActiveEditorPreserveState,
): Record<string, NoteBlock> {
  const byId: Record<string, NoteBlock> = {};
  for (const block of blocks) {
    byId[block.id] = preserveActiveEditorContent(block, state);
  }
  return byId;
}

export const useNoteBlockStore = create<NoteBlockStoreState>((set, get) => ({
  byId: {},
  order: [],
  activeDocumentId: null,
  activeEditor: null,
  hydrate: (blocks) => {
    set((state) => {
      const next = excludePendingDeletes(blocks, state.activeDocumentId);
      return {
        byId: blocksToByIdPreservingActiveEditor(next, state),
        order: next.map((block) => block.id),
      };
    });
  },
  replaceBlocks: (blocks) => {
    set((state) => {
      const next = excludePendingDeletes(blocks, state.activeDocumentId);
      return {
        byId: blocksToByIdPreservingActiveEditor(next, state),
        order: next.map((block) => block.id),
      };
    });
  },
  applyBlocks: (updater) => {
    const current = get().getBlocksArray();
    const next = excludePendingDeletes(updater(current), get().activeDocumentId);
    const byId: Record<string, NoteBlock> = {};
    for (const block of next) byId[block.id] = block;
    set({ byId, order: next.map((block) => block.id) });
    return next;
  },
  /** 구조 갱신 — 편집 중 content는 스토어(최신) 우선, 삭제된 id·타문서 블록은 제거 */
  syncBlocksStructure: (blocks) => {
    set((state) => {
      const docId = state.activeDocumentId;
      const incoming = excludePendingDeletes(blocks, docId);
      const nextById: Record<string, NoteBlock> = { ...state.byId };
      const incomingIds = new Set(incoming.map((b) => b.id));
      const pending = docId ? getStructuralExcludeIds(docId) : new Set<string>();

      if (docId) {
        for (const [id, existing] of Object.entries(nextById)) {
          if (pending.has(id)) {
            delete nextById[id];
            continue;
          }
          if (existing.document_id === docId && !incomingIds.has(id)) {
            delete nextById[id];
          }
        }
      }

      for (const block of incoming) {
        if (docId && block.document_id !== docId) {
          continue;
        }
        const prev = state.byId[block.id];
        const sameType = prev?.type === block.type;
        const isActiveBlock = state.activeEditor?.blockId === block.id;
        if (
          isActiveBlock
          && sameType
          && prev?.content != null
          && (!docId || prev.document_id === docId)
        ) {
          nextById[block.id] = preserveActiveEditorContent(block, state);
          continue;
        }
        nextById[block.id] = block;
      }
      return {
        byId: nextById,
        order: incoming.map((block) => block.id),
      };
    });
  },
  patchContent: (blockId, content) => {
    set((state) => {
      const prev = state.byId[blockId];
      if (!prev) return state;
      if (state.activeDocumentId && prev.document_id !== state.activeDocumentId) return state;
      const prevContent = prev.content as Record<string, unknown> | null | undefined;
      const nextRecord = content as Record<string, unknown>;
      if (prevContent && !contentChangedForUndo(prevContent, nextRecord)) {
        return state;
      }
      return {
        byId: {
          ...state.byId,
          [blockId]: { ...prev, content },
        },
      };
    });
  },
  upsertBlock: (block) => {
    set((state) => {
      const pending = state.activeDocumentId
        ? getStructuralExcludeIds(state.activeDocumentId)
        : new Set<string>();
      if (pending.has(block.id)) return state;
      const exists = !!state.byId[block.id];
      return {
        byId: { ...state.byId, [block.id]: block },
        order: exists ? state.order : [...state.order, block.id],
      };
    });
  },
  removeBlock: (blockId) => {
    set((state) => {
      if (!state.byId[blockId]) return state;
      const next = { ...state.byId };
      delete next[blockId];
      return {
        byId: next,
        order: state.order.filter((id) => id !== blockId),
      };
    });
  },
  setActiveEditor: (active) => {
    const prev = get().activeEditor;
    const sameTarget = prev?.blockId === active?.blockId && prev?.field === active?.field;
    if (!sameTarget && prev) {
      commitActiveNoteEditorToStore();
    }
    if (!sameTarget) {
      clearAllDocumentPreviewCrossHighlights();
    }
    set((state) => {
      if (
        state.activeEditor?.blockId === active?.blockId
        && state.activeEditor?.field === active?.field
      ) {
        return state;
      }
      return { activeEditor: active };
    });
  },
  setActiveDocumentId: (documentId) => {
    set((state) => (
      state.activeDocumentId === documentId ? state : { activeDocumentId: documentId }
    ));
  },
  getBlock: (blockId) => get().byId[blockId],
  getBlocksArray: () => {
    const state = get();
    return state.order
      .map((id) => state.byId[id])
      .filter((block): block is NoteBlock => !!block);
  },
}));

/** activeDocumentId와 무관하게 documentId에 속한 블록만 반환 */
export function selectDocumentBlocks(
  state: NoteBlockStoreState,
  documentId: string | null,
): NoteBlock[] {
  if (!documentId) return [];
  return state.order
    .map((id) => state.byId[id])
    .filter((block): block is NoteBlock => !!block && block.document_id === documentId);
}

/** UI 투영 — Zustand SSOT 단일 구독 (React blocks state 없음) */
export function useActiveDocumentBlocks(documentId: string | null): NoteBlock[] {
  return useNoteBlockStore(
    useShallow((state) => selectDocumentBlocks(state, documentId)),
  );
}

export function useNoteBlockContent(blockId: string) {
  return useNoteBlockStore((state) => state.byId[blockId]?.content);
}

export function useIsNoteActiveEditor(blockId: string, field: NoteActiveEditorField) {
  return useNoteBlockStore(
    (state) =>
      state.activeEditor?.blockId === blockId
      && state.activeEditor?.field === field,
  );
}
