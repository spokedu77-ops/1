'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { devLogger } from '@/app/lib/logging/devLogger';
import {
  flattenVisualBlockIds,
  planBlockDropAt,
  sortRootBlocks,
  topLevelSelectedDragIds,
  type BlockDropPosition,
} from '@/app/lib/note/noteBlockTree';
import { isDocumentDescendantOf } from '@/app/lib/note/orphanSubPageBlocks';
import { clearAllNoteTextSelections } from '../_components/noteCrossSelect';
import { mergeBlocksWithStoreContent } from '../_lib/noteBlockStateMerge';
import { buildBlockForestTransferCommand } from '../_lib/noteBlockTransfer';
import { markPendingBlockDeletes } from '../_lib/noteReconcileIdle';
import { removeStructuralExcludeIds } from '../_lib/noteStructuralExcludeRegistry';
import { reparentDocumentTree } from '../_lib/noteDocumentTreeApi';
import {
  buildMoveBlockGroupCommand,
  buildMoveBlockCommand,
  type NoteBlockCommandResult,
} from '../_lib/noteBlockCommands';
import { persistOpForBlockCommand } from '../_lib/noteBlockCommandPersist';
import type { NoteDocumentEngineApi } from '../_hooks/useNoteDocumentEngine';
import type { BlockDropTarget } from '../_components/noteContexts';
import { resolveBlockDropTarget, resolveBlockDropTargetFromPointer } from '../_lib/noteDropResolver';
import type { NoteBlock, NoteDocument } from '../_lib/types';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import type { useNoteBlockUndo } from '../_hooks/useNoteBlockUndo';

type NoteUndo = ReturnType<typeof useNoteBlockUndo>;

export function useNoteDragDrop(options: {
  blocks: NoteBlock[];
  blocksRef: React.MutableRefObject<NoteBlock[]>;
  setBlocks: React.Dispatch<React.SetStateAction<NoteBlock[]>>;
  documents: NoteDocument[];
  setDocuments: React.Dispatch<React.SetStateAction<NoteDocument[]>>;
  selectedId: string | null;
  setError: (error: string | null) => void;
  triggerSave: () => void;
  noteUndo: NoteUndo;
  selectedBlockIdsRef: React.MutableRefObject<Set<string>>;
  documentEngine: NoteDocumentEngineApi;
  onAfterBlocksChanged?: (nextBlocks: NoteBlock[]) => void;
}) {
  const {
    blocks,
    blocksRef,
    setBlocks,
    documents,
    setDocuments,
    selectedId,
    setError,
    triggerSave,
    noteUndo,
    selectedBlockIdsRef,
    documentEngine,
    onAfterBlocksChanged,
  } = options;

  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [activeDragDocId, setActiveDragDocId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<BlockDropTarget>(null);
  const dropTargetRef = useRef<BlockDropTarget>(null);
  const [multiDragCount, setMultiDragCount] = useState(0);
  const multiDragBlockIdsRef = useRef<string[] | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const noteBlockDragActiveRef = useRef(false);
  const pointerYRef = useRef(0);
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => { pointerYRef.current = e.clientY; };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, []);

  const activeBlock = useMemo(() => {
    if (!activeBlockId) return null;
    return blocks.find((b) => b.id === activeBlockId)
      ?? useNoteBlockStore.getState().getBlock(activeBlockId)
      ?? null;
  }, [activeBlockId, blocks]);
  const activeDragDocument = useMemo(
    () => (activeDragDocId ? documents.find((d) => d.id === activeDragDocId) ?? null : null),
    [activeDragDocId, documents],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    clearAllNoteTextSelections();
    const activeId = String(event.active.id);
    if (activeId.startsWith('doc-drag:')) {
      setActiveDragDocId(activeId.slice('doc-drag:'.length));
      setActiveBlockId(null);
      noteBlockDragActiveRef.current = false;
    } else {
      setActiveBlockId(activeId);
      setActiveDragDocId(null);
      noteBlockDragActiveRef.current = true;
      const selected = selectedBlockIdsRef.current;
      if (selected.size > 1 && selected.has(activeId)) {
        const visualIds = flattenVisualBlockIds(blocksRef.current);
        const orderedSelected = visualIds.filter((id) => selected.has(id));
        const dragIds = topLevelSelectedDragIds(orderedSelected, blocksRef.current);
        multiDragBlockIdsRef.current = dragIds.length > 1 ? dragIds : null;
        setMultiDragCount(orderedSelected.length > 1 ? orderedSelected.length : 0);
      } else {
        multiDragBlockIdsRef.current = null;
        setMultiDragCount(0);
      }
    }
    setDropTarget(null);
    dropTargetRef.current = null;
  }, [blocksRef, selectedBlockIdsRef]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    const activeId = String(active.id);

    if (activeId.startsWith('doc-drag:')) {
      setDropTarget(null);
      dropTargetRef.current = null;
      return;
    }

    if (!over) {
      const pointerTarget = resolveBlockDropTargetFromPointer(
        pointerYRef.current,
        blocksRef.current,
        activeId,
      );
      setDropTarget(pointerTarget);
      dropTargetRef.current = pointerTarget;
      return;
    }

    const overId = String(over.id);
    if (
      overId.startsWith('doc:') ||
      overId.startsWith('doc-drop:') ||
      overId === 'doc-root' ||
      overId === 'doc-root-bottom' ||
      overId === 'doc-workspace-root'
    ) {
      setDropTarget(null);
      dropTargetRef.current = null;
      return;
    }
    if (activeId === overId) {
      const pointerTarget = resolveBlockDropTargetFromPointer(
        pointerYRef.current,
        blocksRef.current,
        activeId,
      );
      setDropTarget(pointerTarget);
      dropTargetRef.current = pointerTarget;
      return;
    }
    const nextTarget = resolveBlockDropTargetFromPointer(
      pointerYRef.current,
      blocksRef.current,
      activeId,
    ) ?? resolveBlockDropTarget(overId, blocksRef.current, event, pointerYRef.current, activeId);
    setDropTarget(nextTarget);
    dropTargetRef.current = nextTarget;
  }, [blocksRef]);

  const handleDragCancel = useCallback(() => {
    setActiveBlockId(null);
    setActiveDragDocId(null);
    setDropTarget(null);
    dropTargetRef.current = null;
    noteBlockDragActiveRef.current = false;
  }, []);

  const handleReparentDocument = useCallback(async (movingDocId: string, newParentId: string | null) => {
    const movingDoc = documents.find((d) => d.id === movingDocId);
    if (!movingDoc || movingDoc.parent_id === newParentId) return;

    const prevDocuments = documents;
    setDocuments((prev) =>
      prev.map((d) => (d.id === movingDocId ? { ...d, parent_id: newParentId } : d)),
    );

    try {
      await documentEngine.flushPersistQueue();
      const result = await reparentDocumentTree({
        documentId: movingDocId,
        newParentId,
      });
      setDocuments((prev) =>
        prev.map((document) => document.id === movingDocId ? result.document : document),
      );
      setBlocks((prev) => {
        const withoutOldLink = prev.filter(
          (block) => !(block.type === 'page' && block.content?.page_document_id === movingDocId),
        );
        const next = result.pageBlock && newParentId === selectedId
          ? [...withoutOldLink, result.pageBlock]
          : withoutOldLink;
        onAfterBlocksChanged?.(next);
        return next;
      });

      triggerSave();
    } catch (e) {
      devLogger.error('[Note] reparentDocument', e);
      setDocuments(prevDocuments);
      setError(e instanceof Error ? e.message : '문서 이동 실패');
    }
  }, [documents, onAfterBlocksChanged, selectedId, triggerSave, documentEngine, setBlocks, setDocuments, setError]);

  const persistBlockReparent = useCallback(async (
    command: NoteBlockCommandResult,
  ) => {
    if (command.affectedIds.length === 0) return;
    const persistOp = persistOpForBlockCommand(command);
    if (persistOp?.type === 'blockTransaction') {
      await documentEngine.persistBlockTransaction(
        persistOp.patches,
        persistOp.deleteIds,
      );
    }
  }, [documentEngine]);

  const runOptimisticBlockCommand = useCallback(async (
    prevBlocks: NoteBlock[],
    command: NoteBlockCommandResult,
    options: {
      logLabel: string;
      errorMessage: string;
      afterPersist?: () => void;
      optimistic?: boolean;
    },
  ): Promise<boolean> => {
    if (command.affectedIds.length === 0) return false;
    noteUndo.pushBlockTransactionUndo(
      prevBlocks,
      command.nextBlocks,
      command.affectedIds,
    );
    if (options.optimistic !== false) {
      setBlocks(command.nextBlocks);
      onAfterBlocksChanged?.(command.nextBlocks);
    }
    try {
      await persistBlockReparent(command);
      await documentEngine.flushPersistQueue();
      if (options.optimistic === false) {
        setBlocks(command.nextBlocks);
        onAfterBlocksChanged?.(command.nextBlocks);
      }
      options.afterPersist?.();
      return true;
    } catch (e) {
      devLogger.error(options.logLabel, e);
      setBlocks(prevBlocks);
      setError(e instanceof Error ? e.message : options.errorMessage);
      return false;
    }
  }, [documentEngine, noteUndo, onAfterBlocksChanged, persistBlockReparent, setBlocks, setError]);

  const runPersistedBlockTransfer = useCallback(async (
    prevBlocks: NoteBlock[],
    command: ReturnType<typeof buildBlockForestTransferCommand>,
    options: {
      logLabel: string;
      errorMessage: string;
      afterPersist?: () => void;
    },
  ): Promise<boolean> => {
    noteUndo.pushRestoreBlocksUndo(
      mergeBlocksWithStoreContent(prevBlocks),
      command.movedIds,
    );
    if (selectedId) {
      markPendingBlockDeletes(selectedId, command.movedIds);
    }
    try {
      setBlocks(command.nextBlocks);
      onAfterBlocksChanged?.(command.nextBlocks);
      await documentEngine.persistBlockTransaction(command.patches);
      await documentEngine.flushPersistQueue();
      options.afterPersist?.();
      return true;
    } catch (e) {
      devLogger.error(options.logLabel, e);
      setBlocks(prevBlocks);
      if (selectedId) removeStructuralExcludeIds(selectedId, command.movedIds);
      setError(e instanceof Error ? e.message : options.errorMessage);
      return false;
    }
  }, [documentEngine, noteUndo, onAfterBlocksChanged, selectedId, setBlocks, setError]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveBlockId(null);
    setActiveDragDocId(null);
    const wasBlockDrag = noteBlockDragActiveRef.current;
    const groupDragIds = multiDragBlockIdsRef.current;
    multiDragBlockIdsRef.current = null;
    setMultiDragCount(0);
    noteBlockDragActiveRef.current = false;
    const { active, over } = event;
    const activeId = String(active.id);
    const blockDropTarget = wasBlockDrag
      ? resolveBlockDropTargetFromPointer(
        pointerYRef.current,
        blocksRef.current,
        activeId,
      ) ?? dropTargetRef.current
      : null;
    const resolvedTarget = over
      ? resolveBlockDropTarget(
        String(over.id),
        blocksRef.current,
        event,
        pointerYRef.current,
        activeId,
      ) ?? blockDropTarget
      : blockDropTarget;
    setDropTarget(null);
    dropTargetRef.current = null;
    if (!over && !resolvedTarget) return;
    if (over && active.id === over.id && !resolvedTarget) return;

    const overId = over ? String(over.id) : '';

    // 사이드바 문서 드래그 → 부모 변경
    if (activeId.startsWith('doc-drag:')) {
      if (!over) return;
      const movingDocId = activeId.slice('doc-drag:'.length);
      if (overId === 'doc-root' || overId === 'doc-root-bottom' || overId === 'doc-workspace-root') {
        await handleReparentDocument(movingDocId, null);
        return;
      }
      if (overId.startsWith('doc-drop:')) {
        const targetDocumentId = overId.slice('doc-drop:'.length);
        if (movingDocId === targetDocumentId) return;
        const docMap = new Map(documents.map((d) => [d.id, d]));
        if (isDocumentDescendantOf(targetDocumentId, movingDocId, docMap)) {
          setError('하위 페이지 안으로는 이동할 수 없습니다.');
          return;
        }
        await handleReparentDocument(movingDocId, targetDocumentId);
        return;
      }
      if (overId.startsWith('doc:')) {
        const targetDocumentId = overId.slice('doc:'.length);
        if (movingDocId === targetDocumentId) return;
        const docMap = new Map(documents.map((d) => [d.id, d]));
        if (isDocumentDescendantOf(targetDocumentId, movingDocId, docMap)) {
          setError('하위 페이지 안으로는 이동할 수 없습니다.');
          return;
        }
        await handleReparentDocument(movingDocId, targetDocumentId);
      }
      return;
    }

    // Drop target is a document (sidebar DocItem) — 블록 이동
    if (over && overId.startsWith('doc:')) {
      const targetDocumentId = overId.slice('doc:'.length);
      const movingBlock = blocksRef.current.find((b) => b.id === activeId);
      if (!movingBlock) return;

      // If dropping onto current document: move block to top of this document
      if (targetDocumentId === selectedId) {
        const prevBlocks = blocksRef.current;
        const rootSiblings = sortRootBlocks(prevBlocks);
        const firstOther = rootSiblings.find((block) => block.id !== movingBlock.id);
        if (!firstOther) return;
        const command = buildMoveBlockGroupCommand(
          prevBlocks,
          [movingBlock.id],
          firstOther.id,
          'before',
        );
        if (command.affectedIds.length === 0) return;
        await runOptimisticBlockCommand(
          prevBlocks,
          command,
          {
            logLabel: '[Note] moveBlockToCurrentDoc',
            errorMessage: '블록 순서 저장 실패',
            afterPersist: triggerSave,
            optimistic: false,
          },
        );
        return;
      }

      // Move the whole subtree across documents so toggle children are not orphaned.
      const previousBlocks = blocksRef.current;
      const command = buildBlockForestTransferCommand(
        previousBlocks,
        [movingBlock.id],
        targetDocumentId,
      );
      if (command.movedIds.length === 0) {
        setError('페이지 링크는 해당 페이지 안으로 옮길 수 없습니다.');
        return;
      }
      await runPersistedBlockTransfer(previousBlocks, command, {
        logLabel: '[Note] moveBlockToDoc',
        errorMessage: '블록 이동 실패',
        afterPersist: triggerSave,
      });
      return;
    }

    const prevBlocks = blocksRef.current;
    const moving = prevBlocks.find((block) => block.id === active.id);
    if (!moving) return;

    const resolvedOverBlockId = overId.startsWith('block-inside:')
      ? overId.slice('block-inside:'.length)
      : overId;
    const overBlock = resolvedOverBlockId
      ? prevBlocks.find((block) => block.id === resolvedOverBlockId)
      : undefined;

    if (groupDragIds && groupDragIds.length > 1) {
      const target = resolvedTarget ?? (overBlock ? { blockId: resolvedOverBlockId, position: 'before' as BlockDropPosition } : null);
      if (target && !groupDragIds.includes(target.blockId)) {
        if (target.position === 'inside') {
          const container = prevBlocks.find((block) => block.id === target.blockId);
          if (container) {
            const visualIds = flattenVisualBlockIds(prevBlocks);
            const ordered = [...groupDragIds].sort(
              (a, b) => visualIds.indexOf(a) - visualIds.indexOf(b),
            );
            const command = buildMoveBlockGroupCommand(
              prevBlocks,
              ordered,
              target.blockId,
              'inside',
            );
            await runOptimisticBlockCommand(prevBlocks, command, {
              logLabel: '[Note] moveBlockGroupInsideBlock',
              errorMessage: '하위 블록 묶음 이동 저장 실패',
              afterPersist: triggerSave,
              optimistic: false,
            });
            return;
          }
        }
        if (target.position !== 'inside') {
          const visualIds = flattenVisualBlockIds(prevBlocks);
          const ordered = [...groupDragIds].sort(
            (a, b) => visualIds.indexOf(a) - visualIds.indexOf(b),
          );
          const command = buildMoveBlockGroupCommand(
            prevBlocks,
            ordered,
            target.blockId,
            target.position,
          );
          if (command.affectedIds.length > 0) {
            await runOptimisticBlockCommand(prevBlocks, command, {
              logLabel: '[Note] moveBlockGroup',
              errorMessage: '블록 묶음 이동 저장 실패',
              afterPersist: triggerSave,
              optimistic: false,
            });
            return;
          }
        }
      }
    }

    let target = resolvedTarget ?? (overBlock && overId ? { blockId: overId, position: 'before' as BlockDropPosition } : null);
    if (!target) return;
    const plan = planBlockDropAt(
      wasBlockDrag ? blocksRef.current : prevBlocks,
      moving.id,
      target.blockId,
      target.position,
    );
    if (!plan) return;

    const command = buildMoveBlockCommand(prevBlocks, moving.id, plan);
    if (command.affectedIds.length === 0) return;
    await runOptimisticBlockCommand(prevBlocks, command, {
      logLabel: '[Note] reparentBlock',
      errorMessage: '블록 이동 저장 실패',
      afterPersist: triggerSave,
      optimistic: false,
    });
  }, [
    blocksRef,
    documents,
    handleReparentDocument,
    runOptimisticBlockCommand,
    runPersistedBlockTransfer,
    selectedId,
    setError,
    triggerSave,
  ]);

  return {
    sensors,
    activeBlockId,
    activeDragDocId,
    activeBlock,
    activeDragDocument,
    dropTarget,
    multiDragCount,
    noteBlockDragActiveRef,
    persistBlockReparent,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  };
}
