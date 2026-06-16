'use client';

import { create } from 'zustand';
import type { NoteBlock } from '../_lib/types';

export type NoteActiveEditorField = 'text' | 'body';

export type NoteActiveEditor = {
  blockId: string;
  field: NoteActiveEditorField;
};

type NoteBlockStoreState = {
  byId: Record<string, NoteBlock>;
  activeEditor: NoteActiveEditor | null;
  hydrate: (blocks: NoteBlock[]) => void;
  patchContent: (blockId: string, content: Record<string, unknown>) => void;
  upsertBlock: (block: NoteBlock) => void;
  removeBlock: (blockId: string) => void;
  setActiveEditor: (active: NoteActiveEditor | null) => void;
  getBlock: (blockId: string) => NoteBlock | undefined;
  getBlocksArray: () => NoteBlock[];
};

export const useNoteBlockStore = create<NoteBlockStoreState>((set, get) => ({
  byId: {},
  activeEditor: null,
  hydrate: (blocks) => {
    const byId: Record<string, NoteBlock> = {};
    for (const block of blocks) byId[block.id] = block;
    set({ byId });
  },
  patchContent: (blockId, content) => {
    set((state) => {
      const prev = state.byId[blockId];
      if (!prev || prev.content === content) return state;
      return {
        byId: {
          ...state.byId,
          [blockId]: { ...prev, content },
        },
      };
    });
  },
  upsertBlock: (block) => {
    set((state) => ({
      byId: { ...state.byId, [block.id]: block },
    }));
  },
  removeBlock: (blockId) => {
    set((state) => {
      if (!state.byId[blockId]) return state;
      const next = { ...state.byId };
      delete next[blockId];
      return { byId: next };
    });
  },
  setActiveEditor: (active) => {
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
  getBlock: (blockId) => get().byId[blockId],
  getBlocksArray: () => Object.values(get().byId),
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
