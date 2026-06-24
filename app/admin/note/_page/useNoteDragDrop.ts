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
  collectDescendantBlockIds,
  applyBlockDropPlanInMemory,
  buildReparentContentPatch,
  flattenVisualBlockIds,
  getBlocksInParent,
  planBlockDropAt,
  planMoveRootBlockGroup,
  sortRootBlocks,
  topLevelSelectedDragIds,
  type BlockDropPlan,
  type BlockDropPosition,
} from '@/app/lib/note/noteBlockTree';
import {
  findOrphanSubPageDocuments,
  isDocumentDescendantOf,
  planOrphanSubPageBlockInserts,
} from '@/app/lib/note/orphanSubPageBlocks';
import { clearAllNoteTextSelections } from '../_components/noteCrossSelect';
import { commitNoteDocumentBeforeLeave, mergeBlocksWithStoreContent } from '../_lib/noteBlockStateMerge';
import { postNoteBlock } from '../_lib/noteBlocksApi';
import { buildBlockTransferPatches } from '../_lib/noteBlockTransfer';
import type { NoteDocumentEngineApi } from '../_hooks/useNoteDocumentEngine';
import { enqueueDocumentPatch } from '../_lib/noteDocumentMetaOpQueue';
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

  const normalizeDepthByOrder = useCallback((orderedBlocks: NoteBlock[]) => {
    let prevDepth = 0;
    const depthPatches: Array<{ id: string; content: Record<string, unknown> }> = [];
    const normalized = orderedBlocks.map((block, index) => {
      const content =
        block.content && typeof block.content === 'object'
          ? (block.content as Record<string, unknown>)
          : null;
      const rawDepth = Number(content?.depth ?? 0);
      const safeDepth = Number.isFinite(rawDepth) ? Math.max(0, Math.min(6, Math.round(rawDepth))) : 0;
      const maxDepth = index === 0 ? 0 : Math.min(6, prevDepth + 1);
      const nextDepth = Math.min(safeDepth, maxDepth);
      prevDepth = nextDepth;
      if (content && safeDepth !== nextDepth) {
        const nextContent = { ...content, depth: nextDepth };
        depthPatches.push({ id: block.id, content: nextContent });
        return { ...block, content: nextContent, order_index: index };
      }
      return { ...block, order_index: index };
    });
    return { normalized, depthPatches };
  }, []);

  const persistOrderAndDepth = useCallback(async (
    orderedBlocks: NoteBlock[],
    depthPatches: Array<{ id: string; content: Record<string, unknown> }>,
  ) => {
    const orders = orderedBlocks.map((block) => ({ id: block.id, order_index: block.order_index }));
    const fieldUpdates = depthPatches.map((patch) => ({
      id: patch.id,
      content: patch.content,
    }));
    await documentEngine.persistReorder({
      orders,
      fieldPatches: fieldUpdates.length > 0 ? fieldUpdates : undefined,
    });
  }, [documentEngine]);

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

    const oldParentId = movingDoc.parent_id;
    const prevDocuments = documents;

    setDocuments((prev) =>
      prev.map((d) => (d.id === movingDocId ? { ...d, parent_id: newParentId } : d)),
    );

    try {
      await documentEngine.flushPersistQueue();
      await enqueueDocumentPatch({ id: movingDocId, parent_id: newParentId });

      if (newParentId === null) {
        setBlocks((prev) =>
          prev.filter((b) => !(b.type === 'page' && b.content?.page_document_id === movingDocId)),
        );
      }

      if (oldParentId) {
        const oldBlocksRes = await fetch(
          `/api/admin/note/blocks?documentId=${encodeURIComponent(oldParentId)}`,
          { credentials: 'include' },
        );
        if (oldBlocksRes.ok) {
          const oldJson = (await oldBlocksRes.json()) as { blocks?: NoteBlock[] };
          const linked = (oldJson.blocks ?? []).filter(
            (b) => b.type === 'page' && b.content?.page_document_id === movingDocId,
          );
          await Promise.all(
            linked.map((b) =>
              fetch(`/api/admin/note/blocks?id=${encodeURIComponent(b.id)}`, {
                method: 'DELETE',
                credentials: 'include',
              }),
            ),
          );
          if (selectedId === oldParentId) {
            setBlocks((prev) =>
              prev.filter((b) => !(b.type === 'page' && b.content?.page_document_id === movingDocId)),
            );
          }
        }
      }

      if (newParentId) {
        let parentBlocks: NoteBlock[] = [];
        if (newParentId === selectedId) {
          parentBlocks = blocksRef.current;
        } else {
          const newBlocksRes = await fetch(
            `/api/admin/note/blocks?documentId=${encodeURIComponent(newParentId)}`,
            { credentials: 'include' },
          );
          if (newBlocksRes.ok) {
            const newJson = (await newBlocksRes.json()) as { blocks?: NoteBlock[] };
            parentBlocks = newJson.blocks ?? [];
          }
        }
        const orphans = findOrphanSubPageDocuments(
          [{ id: movingDocId, title: movingDoc.title }],
          parentBlocks,
        );
        const insertPlans = planOrphanSubPageBlockInserts(orphans, parentBlocks);
        for (const plan of insertPlans) {
          try {
            const createdBlock = newParentId === selectedId
              ? await documentEngine.persistCreateBlock({
                documentId: newParentId,
                blockType: 'page',
                content: plan.content,
                order_index: plan.order_index,
                parent_block_id: null,
              })
              : await postNoteBlock({
                documentId: newParentId,
                blockType: 'page',
                content: plan.content,
                order_index: plan.order_index,
                parent_block_id: null,
              });
            if (newParentId === selectedId) {
              setBlocks((prev) => [...prev, createdBlock]);
            }
          } catch (e) {
            devLogger.error('[Note] reparentOrphanPageBlock', e);
          }
        }
      }

      triggerSave();
    } catch (e) {
      devLogger.error('[Note] reparentDocument', e);
      setDocuments(prevDocuments);
      setError(e instanceof Error ? e.message : '문서 이동 실패');
    }
  }, [documents, selectedId, triggerSave, documentEngine, blocksRef, setBlocks, setError]);

  const persistBlockReparent = useCallback(async (
    moving: NoteBlock,
    plan: BlockDropPlan<NoteBlock>,
    prevBlocks: NoteBlock[],
    extraFieldUpdates: Array<{ id: string; content: Record<string, unknown> }> = [],
  ) => {
    if (!plan) return;
    const oldParentId = moving.parent_block_id ?? null;
    const parentChanged = oldParentId !== plan.targetParentId;
    const contentPatch = buildReparentContentPatch(moving.content, moving.type, plan.placedInToggle);
    const oldSiblings = parentChanged
      ? getBlocksInParent(prevBlocks, oldParentId)
        .filter((block) => block.id !== moving.id)
        .map((block, index) => ({ ...block, order_index: index }))
      : [];

    const orders = [
      ...plan.targetSiblings.map((block, index) => ({ id: block.id, order_index: index })),
      ...oldSiblings.map((block) => ({ id: block.id, order_index: block.order_index })),
    ];

    const fieldUpdates = [
      {
        id: moving.id,
        parent_block_id: plan.targetParentId,
        order_index: plan.targetSiblings.findIndex((block) => block.id === moving.id),
        ...(contentPatch ? { content: contentPatch } : {}),
      },
      ...extraFieldUpdates.map((patch) => ({
        id: patch.id,
        content: patch.content,
      })),
    ];

    await documentEngine.persistReorder({ orders, fieldPatches: fieldUpdates });
  }, [blocksRef, documentEngine]);

  const persistBlockTransfer = useCallback(async (
    rootBlockId: string,
    blockIds: string[],
    targetDocumentId: string,
  ) => {
    const patches = buildBlockTransferPatches(rootBlockId, blockIds, targetDocumentId);
    await documentEngine.persistTransferBlocks(patches);
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
        const idx = rootSiblings.findIndex((block) => block.id === movingBlock.id);
        if (idx < 0) return;
        const movedRoots = [
          rootSiblings[idx],
          ...rootSiblings.slice(0, idx),
          ...rootSiblings.slice(idx + 1),
        ];
        const { normalized, depthPatches } = normalizeDepthByOrder(movedRoots);
        const normalizedMap = new Map(normalized.map((block) => [block.id, block]));
        const nextBlocks = prevBlocks.map((block) => normalizedMap.get(block.id) ?? block);
        setBlocks(nextBlocks);
        try {
          await persistOrderAndDepth(normalized, depthPatches);
        } catch (e) {
          devLogger.error('[Note] moveBlockToCurrentDoc', e);
          setBlocks(prevBlocks);
          setError(e instanceof Error ? e.message : '블록 순서 저장 실패');
        }
        return;
      }

      // Move the whole subtree across documents so toggle children are not orphaned.
      const descendantIds = collectDescendantBlockIds(movingBlock.id, blocksRef.current);
      const idsToMove = [movingBlock.id, ...Array.from(descendantIds)];
      try {
        await persistBlockTransfer(movingBlock.id, idsToMove, targetDocumentId);
        setBlocks((prev) => prev.filter((block) => !idsToMove.includes(block.id)));
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
              const idsToMove = new Set<string>();
              for (const rootId of roots) {
                idsToMove.add(rootId);
                collectDescendantBlockIds(rootId, prevBlocks).forEach((id) => idsToMove.add(id));
              }
              const allIds = [...idsToMove];
              try {
                await commitNoteDocumentBeforeLeave();
                noteUndo.pushRestoreBlocksUndo(
                  mergeBlocksWithStoreContent(prevBlocks),
                  allIds,
                );
                const transferPatches = roots.flatMap((rootId) => {
                  const descendantIds = collectDescendantBlockIds(rootId, prevBlocks);
                  return buildBlockTransferPatches(
                    rootId,
                    [rootId, ...Array.from(descendantIds)],
                    targetDocId,
                  );
                });
                await documentEngine.persistTransferBlocks(transferPatches);
                setBlocks((prev) => prev.filter((block) => !idsToMove.has(block.id)));
                triggerSave();
              } catch (e) {
                devLogger.error('[Note] moveBlockGroupToSubPage', e);
                setBlocks(prevBlocks);
                setError(e instanceof Error ? e.message : '하위 페이지로 블록 묶음 이동 실패');
              }
              return;
            }
          }
          if (container?.type === 'toggle') {
            const visualIds = flattenVisualBlockIds(prevBlocks);
            const ordered = [...groupDragIds].sort(
              (a, b) => visualIds.indexOf(a) - visualIds.indexOf(b),
            );
            const undoIds = new Set<string>(ordered);
            for (const id of ordered) {
              const movingBlock = prevBlocks.find((block) => block.id === id);
              if (movingBlock?.parent_block_id) {
                getBlocksInParent(prevBlocks, movingBlock.parent_block_id).forEach((b) => undoIds.add(b.id));
              }
            }
            getBlocksInParent(prevBlocks, container.id).forEach((b) => undoIds.add(b.id));
            noteUndo.pushRestoreBlocksUndo(prevBlocks, [...undoIds]);

            let nextBlocks = prevBlocks;
            try {
              for (const id of ordered) {
                const movingBlock = nextBlocks.find((block) => block.id === id);
                if (!movingBlock) continue;
                const plan = planBlockDropAt(nextBlocks, id, target.blockId, 'inside');
                if (!plan) continue;
                const before = nextBlocks;
                nextBlocks = applyBlockDropPlanInMemory(nextBlocks, id, plan);
                await persistBlockReparent(movingBlock, plan, before);
              }
              setBlocks(nextBlocks);
              triggerSave();
            } catch (e) {
              devLogger.error('[Note] moveBlockGroupIntoToggle', e);
              setBlocks(prevBlocks);
              setError(e instanceof Error ? e.message : '토글 안 블록 묶음 이동 저장 실패');
            }
            return;
          }
        }
        if (target.position !== 'inside') {
          const nextRoots = planMoveRootBlockGroup(
            prevBlocks,
            groupDragIds,
            target.blockId,
            target.position,
          );
          if (nextRoots) {
            const { normalized, depthPatches } = normalizeDepthByOrder(nextRoots);
            const normalizedMap = new Map(normalized.map((block) => [block.id, block]));
            const nextBlocks = prevBlocks.map((block) => normalizedMap.get(block.id) ?? block);
            setBlocks(nextBlocks);
            try {
              await persistOrderAndDepth(normalized, depthPatches);
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
        const descendantIds = collectDescendantBlockIds(moving.id, prevBlocks);
        const idsToMove = [moving.id, ...Array.from(descendantIds)];
        try {
          await commitNoteDocumentBeforeLeave();
          noteUndo.pushRestoreBlocksUndo(
            mergeBlocksWithStoreContent(prevBlocks),
            idsToMove,
          );
          await persistBlockTransfer(moving.id, idsToMove, targetDocId);
          setBlocks((prev) => prev.filter((block) => !idsToMove.includes(block.id)));
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

    const oldParentId = moving.parent_block_id ?? null;
    const undoIds = new Set<string>([moving.id]);
    getBlocksInParent(prevBlocks, oldParentId).forEach((b) => undoIds.add(b.id));
    if (plan.targetParentId) {
      getBlocksInParent(prevBlocks, plan.targetParentId).forEach((b) => undoIds.add(b.id));
    } else {
      sortRootBlocks(prevBlocks).forEach((b) => undoIds.add(b.id));
    }
    noteUndo.pushRestoreBlocksUndo(prevBlocks, [...undoIds]);

    const targetMap = new Map(plan.targetSiblings.map((block) => [block.id, block]));
    const parentChanged = oldParentId !== plan.targetParentId;
    const oldSiblings = parentChanged
      ? getBlocksInParent(prevBlocks, oldParentId)
        .filter((block) => block.id !== moving.id)
        .map((block, index) => ({ ...block, order_index: index }))
      : [];
    const oldMap = new Map(oldSiblings.map((block) => [block.id, block]));
    const contentPatch = buildReparentContentPatch(moving.content, moving.type, plan.placedInToggle);

    let nextBlocks = prevBlocks.map((block) => {
      if (block.id === moving.id) {
        return {
          ...block,
          parent_block_id: plan.targetParentId,
          order_index: plan.targetSiblings.findIndex((item) => item.id === moving.id),
          content: contentPatch ?? block.content,
        };
      }
      if (targetMap.has(block.id)) return targetMap.get(block.id)!;
      if (oldMap.has(block.id)) return oldMap.get(block.id)!;
      return block;
    });

    let depthPatches: Array<{ id: string; content: Record<string, unknown> }> = [];
    if (plan.targetParentId === null) {
      const normalizedResult = normalizeDepthByOrder(sortRootBlocks(nextBlocks));
      depthPatches = normalizedResult.depthPatches;
      const depthMap = new Map(normalizedResult.normalized.map((block) => [block.id, block]));
      nextBlocks = nextBlocks.map((block) => depthMap.get(block.id) ?? block);
    }

    setBlocks(nextBlocks);
    try {
      await persistBlockReparent(moving, plan, prevBlocks, depthPatches);
    } catch (e) {
      devLogger.error('[Note] reparentBlock', e);
      setBlocks(prevBlocks);
      setError(e instanceof Error ? e.message : '블록 이동 저장 실패');
    }
  }, [normalizeDepthByOrder, noteUndo, persistBlockReparent, persistBlockTransfer, persistOrderAndDepth, selectedId, triggerSave, handleReparentDocument, documents, setBlocks, setError]);

  return {
    sensors,
    activeBlockId,
    activeDragDocId,
    activeBlock,
    activeDragDocument,
    dropTarget,
    multiDragCount,
    noteBlockDragActiveRef,
    normalizeDepthByOrder,
    persistBlockReparent,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  };
}
