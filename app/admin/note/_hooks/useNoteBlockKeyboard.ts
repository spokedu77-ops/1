'use client';

import { useEffect } from 'react';
import { getActiveNoteEditor } from '../_components/noteEditorRegistry';
import {
  clearAllNoteTextSelections,
  getActiveCrossRanges,
} from '../_components/noteCrossSelect';
import { getActiveListCrossRanges } from '../_components/noteListCrossSelect';
import { extractActiveCrossSelectClipboardText } from '../_components/noteListCrossHighlight';
import { parseBlockClipboardText } from '../_lib/noteBlockClipboard';
import type { useNoteBlockUndo } from './useNoteBlockUndo';
import type { NoteBlock } from '../_lib/types';

type NoteUndo = ReturnType<typeof useNoteBlockUndo>;

export function useNoteBlockKeyboard(options: {
  docTab: 'active' | 'trash' | 'block-trash';
  selectedId: string | null;
  blocksRef: React.MutableRefObject<NoteBlock[]>;
  focusedEditorBlockIdRef: React.MutableRefObject<string | null>;
  selectedBlockIdsRef: React.MutableRefObject<Set<string>>;
  titleInputRef: React.RefObject<HTMLTextAreaElement | null>;
  noteUndo: NoteUndo;
  runNoteUndo: () => Promise<void>;
  runNoteRedo: () => Promise<void>;
  handleDuplicateBlock: (block: NoteBlock) => Promise<void>;
  handleCopyBlockLink: (block: NoteBlock) => void;
  handleCopySelectedBlocks: () => Promise<boolean>;
  handleCutSelectedBlocks: () => Promise<void>;
  handlePasteBlockClipboard: (payloadText: string) => Promise<void>;
}) {
  const {
    docTab,
    selectedId,
    blocksRef,
    focusedEditorBlockIdRef,
    selectedBlockIdsRef,
    titleInputRef,
    noteUndo,
    runNoteUndo,
    runNoteRedo,
    handleDuplicateBlock,
    handleCopyBlockLink,
    handleCopySelectedBlocks,
    handleCutSelectedBlocks,
    handlePasteBlockClipboard,
  } = options;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey;
      if (!meta) return;
      const key = e.key.toLowerCase();
      const isUndo = key === 'z' && !e.shiftKey;
      const isRedo = key === 'z' && e.shiftKey;
      if (!isUndo && !isRedo) return;

      const target = e.target as HTMLElement | null;
      const inProseMirror = !!target?.closest('.ProseMirror');
      const inToggleTitle = !!target?.closest('[data-toggle-title]');
      const inDocTitle = target === titleInputRef.current || !!target?.closest('[data-note-doc-title]');

      if (inDocTitle) return;

      const topNoteUndo = isUndo ? noteUndo.peekUndo() : null;
      const preferBlockUndo = topNoteUndo?.kind === 'create-block'
        || topNoteUndo?.kind === 'delete-block'
        || topNoteUndo?.kind === 'restore-blocks';

      if (inToggleTitle) {
        if (isUndo && noteUndo.hasUndo()) {
          e.preventDefault();
          e.stopImmediatePropagation();
          clearAllNoteTextSelections();
          void runNoteUndo();
          return;
        }
        if (isRedo && noteUndo.hasRedo()) {
          e.preventDefault();
          e.stopImmediatePropagation();
          clearAllNoteTextSelections();
          void runNoteRedo();
          return;
        }
        return;
      }

      if (inProseMirror) {
        const editor = getActiveNoteEditor(focusedEditorBlockIdRef.current);
        if (editor) {
          if (isRedo && editor.can().redo()) {
            e.preventDefault();
            e.stopImmediatePropagation();
            clearAllNoteTextSelections();
            editor.chain().focus().redo().run();
            return;
          }
          if (isUndo && editor.can().undo()) {
            e.preventDefault();
            e.stopImmediatePropagation();
            clearAllNoteTextSelections();
            editor.chain().focus().undo().run();
            return;
          }
        }
      }

      if (isUndo && preferBlockUndo && noteUndo.hasUndo()) {
        e.preventDefault();
        e.stopImmediatePropagation();
        clearAllNoteTextSelections();
        void runNoteUndo();
        return;
      }

      if (isUndo && noteUndo.hasUndo()) {
        e.preventDefault();
        e.stopImmediatePropagation();
        clearAllNoteTextSelections();
        void runNoteUndo();
        return;
      }
      if (isRedo && noteUndo.hasRedo()) {
        e.preventDefault();
        e.stopImmediatePropagation();
        clearAllNoteTextSelections();
        void runNoteRedo();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [focusedEditorBlockIdRef, noteUndo, runNoteRedo, runNoteUndo, titleInputRef]);

  useEffect(() => {
    const onCopyKey = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey;
      if (!meta || e.shiftKey || e.altKey) return;
      if (e.key.toLowerCase() !== 'c') return;

      const crossLen = getActiveCrossRanges().length;
      const listLen = getActiveListCrossRanges().length;
      const text = extractActiveCrossSelectClipboardText();
      if (!text) return;
      if (crossLen <= 1 && listLen <= 1 && !text.includes('\n')) return;

      e.preventDefault();
      e.stopImmediatePropagation();
      void navigator.clipboard.writeText(text).catch(() => {
        if (typeof document === 'undefined') return;
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      });
    };
    window.addEventListener('keydown', onCopyKey, true);
    return () => window.removeEventListener('keydown', onCopyKey, true);
  }, []);

  useEffect(() => {
    const shouldUseBlockClipboard = () => {
      if (docTab !== 'active' || !selectedId) return false;
      if (getActiveCrossRanges().length > 0 || getActiveListCrossRanges().length > 0) return false;
      if (selectedBlockIdsRef.current.size === 0) return false;
      const active = document.activeElement as HTMLElement | null;
      if (active?.closest('.ProseMirror')) {
        const editor = getActiveNoteEditor(focusedEditorBlockIdRef.current);
        if (editor && !editor.state.selection.empty) return false;
      }
      return true;
    };

    const onBlockClipboardKey = (e: KeyboardEvent) => {
      if (docTab !== 'active' || !selectedId) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-note-doc-title]')) return;
      const meta = e.ctrlKey || e.metaKey;
      if (!meta || e.shiftKey || e.altKey) return;
      const key = e.key.toLowerCase();

      if (key === 'c' && shouldUseBlockClipboard()) {
        e.preventDefault();
        e.stopImmediatePropagation();
        void handleCopySelectedBlocks();
        return;
      }

      if (key === 'x' && shouldUseBlockClipboard()) {
        e.preventDefault();
        e.stopImmediatePropagation();
        void handleCutSelectedBlocks();
      }
    };

    const onBlockClipboardPaste = (e: ClipboardEvent) => {
      if (docTab !== 'active' || !selectedId) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-note-doc-title]')) return;
      const plain = e.clipboardData?.getData('text/plain') ?? '';
      if (!parseBlockClipboardText(plain)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      void handlePasteBlockClipboard(plain);
    };

    window.addEventListener('keydown', onBlockClipboardKey, true);
    document.addEventListener('paste', onBlockClipboardPaste, true);
    return () => {
      window.removeEventListener('keydown', onBlockClipboardKey, true);
      document.removeEventListener('paste', onBlockClipboardPaste, true);
    };
  }, [
    docTab,
    selectedId,
    focusedEditorBlockIdRef,
    selectedBlockIdsRef,
    handleCopySelectedBlocks,
    handleCutSelectedBlocks,
    handlePasteBlockClipboard,
  ]);

  useEffect(() => {
    const resolveShortcutBlock = (): NoteBlock | null => {
      const selected = selectedBlockIdsRef.current;
      const blockId = selected.size === 1
        ? [...selected][0]
        : (selected.size === 0 ? focusedEditorBlockIdRef.current : null);
      if (!blockId) return null;
      return blocksRef.current.find((b) => b.id === blockId) ?? null;
    };

    const onKey = (e: KeyboardEvent) => {
      if (docTab !== 'active' || !selectedId) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-note-doc-title]')) return;

      const meta = e.ctrlKey || e.metaKey;
      if (meta && !e.shiftKey && e.key.toLowerCase() === 'd') {
        const block = resolveShortcutBlock();
        if (!block) return;
        e.preventDefault();
        void handleDuplicateBlock(block);
        return;
      }

      if (e.altKey && e.shiftKey && e.key.toLowerCase() === 'l') {
        const block = resolveShortcutBlock();
        if (!block) return;
        e.preventDefault();
        handleCopyBlockLink(block);
      }
    };

    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [
    docTab,
    selectedId,
    blocksRef,
    focusedEditorBlockIdRef,
    selectedBlockIdsRef,
    handleDuplicateBlock,
    handleCopyBlockLink,
  ]);
}
