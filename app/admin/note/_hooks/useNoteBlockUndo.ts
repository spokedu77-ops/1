import { useCallback, useRef } from 'react';
import type { NoteBlock } from '../_lib/types';

export type NoteUndoEntry =
  | { kind: 'restore-blocks'; snapshots: NoteBlock[] }
  | { kind: 'undo-create'; blockId: string }
  | { kind: 'undo-delete'; blockId: string };

const MAX_STACK = 100;

function cloneBlock(block: NoteBlock): NoteBlock {
  return JSON.parse(JSON.stringify(block)) as NoteBlock;
}

export function useNoteBlockUndo() {
  const undoStackRef = useRef<NoteUndoEntry[]>([]);

  const pushRestoreBlocksUndo = useCallback((blocks: NoteBlock[], ids: string[]) => {
    const snapshots = blocks
      .filter((block) => ids.includes(block.id))
      .map(cloneBlock);
    if (snapshots.length === 0) return;
    undoStackRef.current.push({ kind: 'restore-blocks', snapshots });
    if (undoStackRef.current.length > MAX_STACK) undoStackRef.current.shift();
  }, []);

  const pushUndoCreate = useCallback((blockId: string) => {
    undoStackRef.current.push({ kind: 'undo-create', blockId });
    if (undoStackRef.current.length > MAX_STACK) undoStackRef.current.shift();
  }, []);

  const pushUndoDelete = useCallback((blockId: string) => {
    undoStackRef.current.push({ kind: 'undo-delete', blockId });
    if (undoStackRef.current.length > MAX_STACK) undoStackRef.current.shift();
  }, []);

  const hasUndo = useCallback(() => undoStackRef.current.length > 0, []);

  const popUndo = useCallback((): NoteUndoEntry | null => {
    return undoStackRef.current.pop() ?? null;
  }, []);

  const clearUndo = useCallback(() => {
    undoStackRef.current = [];
  }, []);

  return {
    pushRestoreBlocksUndo,
    pushUndoCreate,
    pushUndoDelete,
    hasUndo,
    popUndo,
    clearUndo,
  };
}
