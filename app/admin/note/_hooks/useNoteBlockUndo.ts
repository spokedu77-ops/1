import { useCallback, useRef } from 'react';
import type { NoteBlock } from '../_lib/types';

export type NoteHistoryEntry =
  | { kind: 'restore-blocks'; snapshots: NoteBlock[] }
  | { kind: 'delete-block'; snapshot: NoteBlock }
  | { kind: 'create-block'; snapshot: NoteBlock };

const MAX_STACK = 100;

function cloneBlock(block: NoteBlock): NoteBlock {
  return JSON.parse(JSON.stringify(block)) as NoteBlock;
}

export function buildNoteHistoryInverse(
  entry: NoteHistoryEntry,
  blocks: NoteBlock[],
): NoteHistoryEntry | null {
  if (entry.kind === 'delete-block') {
    return { kind: 'create-block', snapshot: cloneBlock(entry.snapshot) };
  }
  if (entry.kind === 'create-block') {
    return { kind: 'delete-block', snapshot: cloneBlock(entry.snapshot) };
  }
  const ids = new Set(entry.snapshots.map((snapshot) => snapshot.id));
  const current = blocks
    .filter((block) => ids.has(block.id))
    .map(cloneBlock);
  if (current.length === 0) return null;
  return { kind: 'restore-blocks', snapshots: current };
}

export function useNoteBlockUndo() {
  const undoStackRef = useRef<NoteHistoryEntry[]>([]);
  const redoStackRef = useRef<NoteHistoryEntry[]>([]);

  const trimStack = (stack: NoteHistoryEntry[]) => {
    if (stack.length > MAX_STACK) stack.shift();
  };

  const pushUndo = useCallback((entry: NoteHistoryEntry) => {
    undoStackRef.current.push(entry);
    trimStack(undoStackRef.current);
    redoStackRef.current = [];
  }, []);

  const pushRestoreBlocksUndo = useCallback((blocks: NoteBlock[], ids: string[]) => {
    const snapshots = blocks
      .filter((block) => ids.includes(block.id))
      .map(cloneBlock);
    if (snapshots.length === 0) return;
    pushUndo({ kind: 'restore-blocks', snapshots });
  }, [pushUndo]);

  const pushDeleteBlockUndo = useCallback((snapshot: NoteBlock) => {
    pushUndo({ kind: 'delete-block', snapshot: cloneBlock(snapshot) });
  }, [pushUndo]);

  const pushCreateBlockUndo = useCallback((snapshot: NoteBlock) => {
    pushUndo({ kind: 'create-block', snapshot: cloneBlock(snapshot) });
  }, [pushUndo]);

  const hasUndo = useCallback(() => undoStackRef.current.length > 0, []);
  const hasRedo = useCallback(() => redoStackRef.current.length > 0, []);

  const peekUndo = useCallback((): NoteHistoryEntry | null => {
    const stack = undoStackRef.current;
    return stack.length > 0 ? stack[stack.length - 1] : null;
  }, []);

  const popUndo = useCallback((): NoteHistoryEntry | null => {
    return undoStackRef.current.pop() ?? null;
  }, []);

  const popRedo = useCallback((): NoteHistoryEntry | null => {
    return redoStackRef.current.pop() ?? null;
  }, []);

  const pushRedo = useCallback((entry: NoteHistoryEntry) => {
    redoStackRef.current.push(entry);
    trimStack(redoStackRef.current);
  }, []);

  const clearHistory = useCallback(() => {
    undoStackRef.current = [];
    redoStackRef.current = [];
  }, []);

  const pushUndoNoClear = useCallback((entry: NoteHistoryEntry) => {
    undoStackRef.current.push(entry);
    trimStack(undoStackRef.current);
  }, []);

  return {
    pushRestoreBlocksUndo,
    pushDeleteBlockUndo,
    pushCreateBlockUndo,
    pushUndoNoClear,
    hasUndo,
    hasRedo,
    peekUndo,
    popUndo,
    popRedo,
    pushRedo,
    clearHistory,
  };
}

export type NoteUndo = ReturnType<typeof useNoteBlockUndo>;
