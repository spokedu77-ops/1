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
  getBlocksInParent,
  planBlockDropAt,
  sortRootBlocks,
  topLevelSelectedDragIds,
  type BlockDropPosition,
} from '@/app/lib/note/noteBlockTree';
import { isDocumentDescendantOf } from '@/app/lib/note/orphanSubPageBlocks';
import { clearAllNoteTextSelections } from '../_components/noteCrossSelect';
import { commitNoteDocumentBeforeLeave, mergeBlocksWithStoreContent } from '../_lib/noteBlockStateMerge';
import { buildBlockForestTransferCommand } from '../_lib/noteBlockTransfer';
import { reparentDocumentTree } from '../_lib/noteDocumentTreeApi';
import {
  buildMoveBlockGroupCommand,
  buildMoveBlockCommand,
  type NoteBlockCommandResult,
} from '../_lib/noteBlockCommands';
import type { NoteDocumentEngineApi } from '../_hooks/useNoteDocumentEngine';
import type { BlockDropTarget } from '../_components/noteContexts';
import { resolveBlockDropTarget } from '../_lib/noteDropResolver';
import type { NoteBlock, NoteDocument } from '../_lib/types';
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

  const activeBlock = useMemo(
    () => (activeBlockId ? blocks.find((b) => b.id === activeBlockId) ?? null : null),
    [activeBlockId, blocks],
  );
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
        const rootIds = sortRootBlocks(blocksRef.current)
          .filter((block) => selected.has(block.id))
          .map((block) => block.id);
        multiDragBlockIdsRef.current = rootIds.length > 1 ? rootIds : null;
        setMultiDragCount(rootIds.length > 1 ? rootIds.length : 0);
      } else {
        multiDragBlockIdsRef.current = null;
        setMultiDragCount(0);
      }
    }
    setDropTarget(null);
    dropTargetRef.current = null;
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) {
      setDropTarget(null);
      dropTargetRef.current = null;
      return;
    }
    const activeId = String(active.id);
    const overId = String(over.id);
    if (
      activeId.startsWith('doc-drag:') ||
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
      setDropTarget(null);
      dropTargetRef.current = null;
      return;
    }
    const nextTarget = resolveBlockDropTarget(overId, blocksRef.current, event, pointerYRef.current);
    setDropTarget(nextTarget);
    dropTargetRef.current = nextTarget;
  }, []);

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
        return result.pageBlock && newParentId === selectedId
          ? [...withoutOldLink, result.pageBlock]
          : withoutOldLink;
      });

      triggerSave();
    } catch (e) {
      devLogger.error('[Note] reparentDocument', e);
      setDocuments(prevDocuments);
      setError(e instanceof Error ? e.message : '문서 이동 실패');
    }
  }, [documents, selectedId, triggerSave, documentEngine, blocksRef, setBlocks, setError]);

  const persistBlockReparent = useCallback(async (
    command: NoteBlockCommandResult,
  ) => {
    if (command.affectedIds.length === 0) return;
    const patchesById = new Map(
      command.fieldPatches.map((patch) => [patch.id, patch]),
    );
    for (const order of command.orders) {
      patchesById.set(order.id, {
        ...patchesById.get(order.id),
        ...order,
      });
    }
    await documentEngine.persistBlockTransaction([...patchesById.values()]);
  }, [documentEngine]);

  const persistBlockTransfer = useCallback(async (
    sourceBlocks: NoteBlock[],
    rootIds: string[],
    targetDocumentId: string,
  ) => {
    const command = buildBlockForestTransferCommand(
      sourceBlocks,
      rootIds,
      targetDocumentId,
    );
    await documentEngine.persistBlockTransaction(command.patches);
    return command;
  }, [documentEngine]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveBlockId(null);
    setActiveDragDocId(null);
    const wasBlockDrag = noteBlockDragActiveRef.current;
    const groupDragIds = multiDragBlockIdsRef.current;
    multiDragBlockIdsRef.current = null;
    setMultiDragCount(0);
    noteBlockDragActiveRef.current = false;
    const { active, over } = event;
    const resolvedTarget = over
      ? resolveBlockDropTarget(String(over.id), blocksRef.current, event, pointerYRef.current)
      : dropTargetRef.current;
    setDropTarget(null);
    dropTargetRef.current = null;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // 사이드바 문서 드래그 → 부모 변경
    if (activeId.startsWith('doc-drag:')) {
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
    if (overId.startsWith('doc:')) {
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
        noteUndo.pushBlockTransactionUndo(
          prevBlocks,
          command.nextBlocks,
          command.affectedIds,
        );
        setBlocks(command.nextBlocks);
        try {
          await documentEngine.persistBlockTransaction(command.fieldPatches);
        } catch (e) {
          devLogger.error('[Note] moveBlockToCurrentDoc', e);
          setBlocks(prevBlocks);
          setError(e instanceof Error ? e.message : '블록 순서 저장 실패');
        }
        return;
      }

      // Move the whole subtree across documents so toggle children are not orphaned.
      const previousBlocks = blocksRef.current;
      try {
        const planned = buildBlockForestTransferCommand(
          previousBlocks,
          [movingBlock.id],
          targetDocumentId,
        );
        noteUndo.pushRestoreBlocksUndo(
          mergeBlocksWithStoreContent(previousBlocks),
          planned.movedIds,
        );
        const command = await persistBlockTransfer(
          previousBlocks,
          [movingBlock.id],
          targetDocumentId,
        );
        setBlocks(command.nextBlocks);
        triggerSave();
      } catch (e) {
        devLogger.error('[Note] moveBlockToDoc', e);
        setError(e instanceof Error ? e.message : '블록 이동 실패');
      }
      return;
    }

    const prevBlocks = blocksRef.current;
    const moving = prevBlocks.find((block) => block.id === active.id);
    if (!moving) return;

    const resolvedOverBlockId = overId.startsWith('block-inside:')
      ? overId.slice('block-inside:'.length)
      : overId;
    const overBlock = prevBlocks.find((block) => block.id === resolvedOverBlockId);

    if (groupDragIds && groupDragIds.length > 1) {
      const target = resolvedTarget ?? (overBlock ? { blockId: resolvedOverBlockId, position: 'before' as BlockDropPosition } : null);
      if (target && !groupDragIds.includes(target.blockId)) {
        if (target.position === 'inside') {
          const container = prevBlocks.find((block) => block.id === target.blockId);
          if (container?.type === 'page') {
            const targetDocId =
              typeof container.content?.page_document_id === 'string'
                ? container.content.page_document_id.trim()
                : '';
            if (targetDocId && targetDocId !== selectedId) {
              const visualIds = flattenVisualBlockIds(prevBlocks);
              const ordered = [...groupDragIds].sort(
                (a, b) => visualIds.indexOf(a) - visualIds.indexOf(b),
              );
              const roots = topLevelSelectedDragIds(ordered, prevBlocks);
              try {
                await commitNoteDocumentBeforeLeave();
                const command = buildBlockForestTransferCommand(
                  prevBlocks,
                  roots,
                  targetDocId,
                );
                noteUndo.pushRestoreBlocksUndo(
                  mergeBlocksWithStoreContent(prevBlocks),
                  command.movedIds,
                );
                await documentEngine.persistBlockTransaction(command.patches);
                setBlocks(command.nextBlocks);
                triggerSave();
              } catch (e) {
                devLogger.error('[Note] moveBlockGroupToSubPage', e);
                setBlocks(prevBlocks);
                setError(e instanceof Error ? e.message : '하위 페이지로 블록 묶음 이동 실패');
              }
              return;
            }
          }
          if (container && container.type !== 'page') {
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
            if (command.affectedIds.length === 0) return;
            try {
              noteUndo.pushBlockTransactionUndo(
                prevBlocks,
                command.nextBlocks,
                command.affectedIds,
              );
              setBlocks(command.nextBlocks);
              await documentEngine.persistBlockTransaction(command.fieldPatches);
              triggerSave();
            } catch (e) {
              devLogger.error('[Note] moveBlockGroupInsideBlock', e);
              setBlocks(prevBlocks);
              setError(e instanceof Error ? e.message : '하위 블록 묶음 이동 저장 실패');
            }
            return;
          }
        }
        if (target.position !== 'inside') {
          const command = buildMoveBlockGroupCommand(
            prevBlocks,
            groupDragIds,
            target.blockId,
            target.position,
          );
          if (command.affectedIds.length > 0) {
            noteUndo.pushBlockTransactionUndo(
              prevBlocks,
              command.nextBlocks,
              command.affectedIds,
            );
            setBlocks(command.nextBlocks);
            try {
              await documentEngine.persistBlockTransaction(command.fieldPatches);
            } catch (e) {
              devLogger.error('[Note] moveBlockGroup', e);
              setBlocks(prevBlocks);
              setError(e instanceof Error ? e.message : '블록 묶음 이동 저장 실패');
            }
            return;
          }
        }
      }
    }

    const pageInsideTarget = resolvedTarget
      ? prevBlocks.find((block) => block.id === resolvedTarget.blockId)
      : overBlock;
    if (pageInsideTarget?.type === 'page' && resolvedTarget?.position === 'inside') {
      const targetDocId =
        typeof pageInsideTarget.content?.page_document_id === 'string'
          ? pageInsideTarget.content.page_document_id.trim()
          : '';
      if (targetDocId && targetDocId !== selectedId) {
        try {
          await commitNoteDocumentBeforeLeave();
          const command = buildBlockForestTransferCommand(
            prevBlocks,
            [moving.id],
            targetDocId,
          );
          noteUndo.pushRestoreBlocksUndo(
            mergeBlocksWithStoreContent(prevBlocks),
            command.movedIds,
          );
          await documentEngine.persistBlockTransaction(command.patches);
          setBlocks(command.nextBlocks);
          triggerSave();
        } catch (e) {
          devLogger.error('[Note] moveBlockToSubPage', e);
          setError(e instanceof Error ? e.message : '하위 페이지로 블록 이동 실패');
        }
        return;
      }
    }

    const target = resolvedTarget ?? (overBlock ? { blockId: overId, position: 'before' as BlockDropPosition } : null);
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
    noteUndo.pushBlockTransactionUndo(prevBlocks, command.nextBlocks, command.affectedIds);
    setBlocks(command.nextBlocks);
    try {
      await persistBlockReparent(command);
    } catch (e) {
      devLogger.error('[Note] reparentBlock', e);
      setBlocks(prevBlocks);
      setError(e instanceof Error ? e.message : '블록 이동 저장 실패');
    }
  }, [noteUndo, persistBlockReparent, persistBlockTransfer, selectedId, triggerSave, handleReparentDocument, documents, setBlocks, setError]);

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
