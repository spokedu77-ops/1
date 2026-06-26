'use client';

import { create } from 'zustand';
import { clearAllDocumentPreviewCrossHighlights } from '../_components/noteBlockPreviewCrossSelect';
import { commitActiveNoteEditorToStore } from '../_lib/noteBlockStateMerge';
import {
  contentChangedForUndo,
  mergeBlockContentWithStore,
} from '../_lib/noteContentPatch';
import type { NoteTableCellField } from '../_lib/noteTableBlock';
import type { NoteBlock } from '../_lib/types';

export type NoteActiveEditorField = 'text' | 'body' | NoteTableCellField;

export type NoteActiveEditor = {
  blockId: string;
  field: NoteActiveEditorField;
};

type NoteBlockStoreState = {
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

export const useNoteBlockStore = create<NoteBlockStoreState>((set, get) => ({
  byId: {},
  order: [],
  activeDocumentId: null,
  activeEditor: null,
  hydrate: (blocks) => {
    const byId: Record<string, NoteBlock> = {};
    for (const block of blocks) byId[block.id] = block;
    set({ byId, order: blocks.map((block) => block.id) });
  },
  replaceBlocks: (blocks) => {
    const byId: Record<string, NoteBlock> = {};
    for (const block of blocks) byId[block.id] = block;
    set({ byId, order: blocks.map((block) => block.id) });
  },
  applyBlocks: (updater) => {
    const current = get().getBlocksArray();
    const next = updater(current);
    const byId: Record<string, NoteBlock> = {};
    for (const block of next) byId[block.id] = block;
    set({ byId, order: next.map((block) => block.id) });
    return next;
  },
  /** React blocks 구조 갱신 — 편집 중 content는 스토어(최신) 우선, 삭제된 id는 제거 */
  syncBlocksStructure: (blocks) => {
    set((state) => {
      const docId = state.activeDocumentId;
      const nextById: Record<string, NoteBlock> = { ...state.byId };
      const incomingIds = new Set(blocks.map((b) => b.id));

      if (docId) {
        for (const [id, existing] of Object.entries(nextById)) {
          if (existing.document_id === docId && !incomingIds.has(id)) {
            delete nextById[id];
          }
        }
      }

      for (const incoming of blocks) {
        if (docId && incoming.document_id !== docId) {
          nextById[incoming.id] = incoming;
          continue;
        }
        const prev = state.byId[incoming.id];
        const sameType = prev?.type === incoming.type;
        const isActiveBlock = state.activeEditor?.blockId === incoming.id;
        if (
          isActiveBlock
          && sameType
          && prev?.content != null
          && (!docId || prev.document_id === docId)
        ) {
          nextById[incoming.id] = {
            ...incoming,
            content: mergeBlockContentWithStore(
              incoming.content as Record<string, unknown> | null | undefined,
              prev.content as Record<string, unknown>,
            ) ?? prev.content,
          };
          continue;
        }
        nextById[incoming.id] = incoming;
      }
      return {
        byId: nextById,
        order: blocks.map((block) => block.id),
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
