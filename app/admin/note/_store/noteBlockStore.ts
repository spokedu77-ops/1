'use client';

import { create } from 'zustand';
import { normalizeListBlockContentRecord } from '../_components/noteBulletInput';
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
  activeDocumentId: string | null;
  activeEditor: NoteActiveEditor | null;
  hydrate: (blocks: NoteBlock[]) => void;
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
  activeDocumentId: null,
  activeEditor: null,
  hydrate: (blocks) => {
    const byId: Record<string, NoteBlock> = {};
    for (const block of blocks) byId[block.id] = block;
    set({ byId });
  },
  /** React blocks 구조 갱신 — 편집 중 content는 스토어(최신) 우선, 삭제된 id는 제거 */
  syncBlocksStructure: (blocks) => {
    set((state) => {
      const docId = state.activeDocumentId;
      const byId: Record<string, NoteBlock> = {};
      for (const incoming of blocks) {
        if (docId && incoming.document_id !== docId) {
          byId[incoming.id] = incoming;
          continue;
        }
        const prev = state.byId[incoming.id];
        const sameType = prev?.type === incoming.type;
        const isActiveBlock = state.activeEditor?.blockId === incoming.id;
        if (
          sameType
          && prev?.content != null
          && (!docId || prev.document_id === docId)
        ) {
          if (isActiveBlock) {
            byId[incoming.id] = {
              ...incoming,
              content: mergeBlockContentWithStore(
                incoming.content as Record<string, unknown> | null | undefined,
                prev.content as Record<string, unknown>,
              ) ?? prev.content,
            };
            continue;
          }
          const mergedContent = mergeBlockContentWithStore(
            incoming.content as Record<string, unknown> | null | undefined,
            prev.content as Record<string, unknown>,
          );
          byId[incoming.id] = mergedContent !== incoming.content
            ? { ...incoming, content: mergedContent }
            : incoming;
        } else {
          const content = (incoming.type === 'bulletList' || incoming.type === 'numberedList')
            && incoming.content
            ? normalizeListBlockContentRecord(incoming.content as Record<string, unknown>)
            : incoming.content;
          byId[incoming.id] = content !== incoming.content
            ? { ...incoming, content }
            : incoming;
        }
      }
      return { byId };
    });
  },
  patchContent: (blockId, content) => {
    set((state) => {
      const prev = state.byId[blockId];
      if (!prev) return state;
      if (state.activeDocumentId && prev.document_id !== state.activeDocumentId) return state;
      let nextContent = content;
      if (prev.type === 'bulletList' || prev.type === 'numberedList') {
        nextContent = normalizeListBlockContentRecord(content);
      }
      const prevContent = prev.content as Record<string, unknown> | null | undefined;
      const nextRecord = nextContent as Record<string, unknown>;
      if (prevContent && !contentChangedForUndo(prevContent, nextRecord)) {
        return state;
      }
      return {
        byId: {
          ...state.byId,
          [blockId]: { ...prev, content: nextContent },
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
