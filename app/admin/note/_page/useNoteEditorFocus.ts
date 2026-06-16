'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import { focusWithoutScroll, suppressNoteEditorScrollBriefly } from '../_lib/noteEditorScrollGuard';
import type { NoteBlock } from '../_lib/types';

export function useNoteEditorFocus(options: {
  blocksRef: React.MutableRefObject<NoteBlock[]>;
  setBlocks: React.Dispatch<React.SetStateAction<NoteBlock[]>>;
  selectedBlockIdsRef: React.MutableRefObject<Set<string>>;
  setSelectedBlockIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedId: string | null;
  loadingBlocks: boolean;
  activeDocumentTitle?: string;
}) {
  const {
    blocksRef,
    setBlocks,
    selectedBlockIdsRef,
    setSelectedBlockIds,
    selectedId,
    loadingBlocks,
    activeDocumentTitle,
  } = options;

  const [mergeFocusCaretOffset, setMergeFocusCaretOffset] = useState<number | undefined>(undefined);
  const requestCaretOffset = useCallback((offset: number) => {
    setMergeFocusCaretOffset(offset);
    window.setTimeout(() => setMergeFocusCaretOffset(undefined), 0);
  }, []);

  const [focusedEditorBlockId, setFocusedEditorBlockId] = useState<string | null>(null);
  const [focusedEditorPart, setFocusedEditorPart] = useState<'title' | 'editor' | null>(null);
  const [focusSignal, setFocusSignal] = useState(0);
  const [focusTitleSignal, setFocusTitleSignal] = useState(0);
  const [focusedToggleId, setFocusedToggleId] = useState<string | null>(null);

  const focusedEditorBlockIdRef = useRef<string | null>(null);
  const focusedEditorPartRef = useRef<'title' | 'editor' | null>(null);
  const titleInputRef = useRef<HTMLTextAreaElement>(null);
  const editorScrollRef = useRef<HTMLDivElement>(null);
  const pendingFocusDocTitleRef = useRef<string | null>(null);

  const syncFocusedToggleFromBlock = useCallback((blockId: string) => {
    const block = blocksRef.current.find((b) => b.id === blockId);
    if (!block) return;
    if (block.type === 'toggle') {
      setFocusedToggleId(block.id);
      return;
    }
    const parentId = block.parent_block_id ?? null;
    if (!parentId) return;
    const parent = blocksRef.current.find((b) => b.id === parentId);
    if (parent?.type === 'toggle') {
      setFocusedToggleId(parent.id);
    }
  }, [blocksRef]);

  const commitBlockToState = useCallback((blockId: string) => {
    const fromStore = useNoteBlockStore.getState().getBlock(blockId);
    const latest = fromStore ?? blocksRef.current.find((b) => b.id === blockId);
    if (!latest) return;
    blocksRef.current = blocksRef.current.map((b) => (b.id === blockId ? latest : b));
    setBlocks((prev) => {
      const current = prev.find((b) => b.id === blockId);
      if (!current || current.content === latest.content) return prev;
      return prev.map((b) => (b.id === blockId ? latest : b));
    });
  }, [blocksRef, setBlocks]);

  const trackActiveBlock = useCallback((blockId: string | null, part: 'title' | 'editor' = 'editor') => {
    if (!blockId) return;
    focusedEditorBlockIdRef.current = blockId;
    focusedEditorPartRef.current = part;
    setFocusedEditorBlockId(blockId);
    setFocusedEditorPart(part);
    syncFocusedToggleFromBlock(blockId);
  }, [syncFocusedToggleFromBlock]);

  const focusBlockEditor = useCallback((
    blockId: string | null,
    part: 'title' | 'editor' = 'editor',
    caretOffset?: number,
    opts?: { preventScroll?: boolean },
  ) => {
    if (!blockId) return;
    if (opts?.preventScroll) {
      suppressNoteEditorScrollBriefly();
    }
    const previousBlockId = focusedEditorBlockIdRef.current;
    if (previousBlockId && previousBlockId !== blockId) {
      commitBlockToState(previousBlockId);
    }
    if (part === 'title') {
      useNoteBlockStore.getState().setActiveEditor(null);
    } else {
      const active = useNoteBlockStore.getState().activeEditor;
      if (active?.blockId !== blockId) {
        useNoteBlockStore.getState().setActiveEditor({ blockId, field: 'text' });
      }
    }
    const alreadyFocused =
      focusedEditorBlockIdRef.current === blockId
      && focusedEditorPartRef.current === part;
    if (selectedBlockIdsRef.current.size > 0) {
      setSelectedBlockIds(new Set());
    }
    if (caretOffset !== undefined) {
      setMergeFocusCaretOffset(caretOffset);
      window.setTimeout(() => setMergeFocusCaretOffset(undefined), 0);
    } else if (!alreadyFocused) {
      setMergeFocusCaretOffset(undefined);
    }
    focusedEditorBlockIdRef.current = blockId;
    focusedEditorPartRef.current = part;
    setFocusedEditorBlockId(blockId);
    setFocusedEditorPart(part);
    if (!alreadyFocused) {
      if (part === 'title') {
        setFocusTitleSignal((v) => v + 1);
      } else {
        setFocusSignal((v) => v + 1);
      }
    }
    syncFocusedToggleFromBlock(blockId);
  }, [commitBlockToState, selectedBlockIdsRef, setSelectedBlockIds, syncFocusedToggleFromBlock]);

  useEffect(() => {
    const el = titleInputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [activeDocumentTitle]);

  useEffect(() => {
    if (!selectedId || loadingBlocks) return;
    if (pendingFocusDocTitleRef.current !== selectedId) return;
    pendingFocusDocTitleRef.current = null;
    requestAnimationFrame(() => {
      const el = titleInputRef.current;
      if (!el) return;
      focusWithoutScroll(el);
      el.select();
    });
  }, [selectedId, loadingBlocks]);

  return {
    focusedEditorBlockId,
    setFocusedEditorBlockId,
    focusedEditorPart,
    setFocusedEditorPart,
    focusSignal,
    focusTitleSignal,
    focusedToggleId,
    setFocusedToggleId,
    mergeFocusCaretOffset,
    setMergeFocusCaretOffset,
    requestCaretOffset,
    focusedEditorBlockIdRef,
    focusedEditorPartRef,
    titleInputRef,
    editorScrollRef,
    pendingFocusDocTitleRef,
    syncFocusedToggleFromBlock,
    commitBlockToState,
    trackActiveBlock,
    focusBlockEditor,
  };
}
