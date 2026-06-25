'use client';

import { useCallback, useRef } from 'react';
import { devLogger } from '@/app/lib/logging/devLogger';
import { getBlocksInParent, sortRootBlocks } from '@/app/lib/note/noteBlockTree';
import { defaultBlockContent } from '../_lib/constants';
import {
  buildInsertBlockCommand,
  collectBlockTransactionIds,
} from '../_lib/noteBlockCommands';
import type { NoteBlockCommandResult } from '../_lib/noteBlockCommands';
import type { NoteDocumentEngineApi } from '../_hooks/useNoteDocumentEngine';
import type { LoadingState, NoteBlock } from '../_lib/types';

export function useNoteBlockInsert(options: {
  blocks: NoteBlock[];
  blocksRef: React.MutableRefObject<NoteBlock[]>;
  setBlocks: React.Dispatch<React.SetStateAction<NoteBlock[]>>;
  selectedId: string | null;
  focusedToggleId: string | null;
  focusedEditorBlockId: string | null;
  focusedEditorBlockIdRef: React.MutableRefObject<string | null>;
  setLoadingState: (state: LoadingState) => void;
  setError: (error: string | null) => void;
  documentEngine: NoteDocumentEngineApi;
  recordBlockCommandUndo: (
    previousBlocks: NoteBlock[],
    command: NoteBlockCommandResult,
  ) => void;
  recordBlockTransactionUndo: (
    previousBlocks: NoteBlock[],
    nextBlocks: NoteBlock[],
    affectedIds: string[],
  ) => void;
  handleUpdateBlock: (block: NoteBlock, content: Record<string, unknown>) => void;
  focusBlockEditor: (
    blockId: string | null,
    part?: 'title' | 'editor',
    caretOffset?: number,
    options?: { preventScroll?: boolean },
  ) => void;
  handleCreateSubPage: (
    parentDocumentId: string,
    options?: {
      insertAfterBlockId?: string;
      insertIndex?: number;
      parentBlockId?: string | null;
      navigateToChild?: boolean;
      title?: string;
    },
  ) => Promise<void>;
}) {
  const {
    blocks,
    blocksRef,
    setBlocks,
    selectedId,
    focusedToggleId,
    focusedEditorBlockId,
    focusedEditorBlockIdRef,
    setLoadingState,
    setError,
    documentEngine,
    recordBlockCommandUndo,
    recordBlockTransactionUndo,
    handleUpdateBlock,
    focusBlockEditor,
    handleCreateSubPage,
  } = options;

  const ensuringMinimumBlockRef = useRef(false);

  const insertBlockAmongSiblings = useCallback(async (
    parentId: string | null,
    type: NoteBlock['type'],
    insertIndex: number,
    insertOptions?: { content?: Record<string, unknown>; focus?: boolean; registerUndo?: boolean },
  ): Promise<NoteBlock | null> => {
    if (!selectedId) return null;
    try {
      setLoadingState('saving');
      const siblings = blocksRef.current
        .filter((b) => (b.parent_block_id ?? null) === parentId)
        .sort((a, b) => a.order_index - b.order_index);
      const clampedIndex = Math.max(0, Math.min(insertIndex, siblings.length));
      const parentBlock = parentId ? blocksRef.current.find((b) => b.id === parentId) : null;
      const insideToggle = parentBlock?.type === 'toggle';
      const baseContent = insertOptions?.content ?? defaultBlockContent(type, { insideToggle });
      const baseContentMap = baseContent as Record<string, unknown>;
      const blockContent = (insideToggle && baseContent && !baseContentMap.placedInToggle)
        ? { ...baseContent, placedInToggle: true }
        : baseContent;
      const createdBlock = await documentEngine.persistCreateBlock({
        documentId: selectedId,
        blockType: type,
        content: blockContent as Record<string, unknown>,
        order_index: clampedIndex,
        parent_block_id: parentId,
      });
      const command = buildInsertBlockCommand(
        blocksRef.current,
        createdBlock,
        parentId,
        insertIndex,
      );
      const previousBlocks = blocksRef.current;
      setBlocks(command.nextBlocks);
      if (command.orders.length > 0) {
        void documentEngine.persistReorder({ orders: command.orders }).catch((e) => {
          devLogger.error('[Note] normalizeInsertOrder', e);
        });
      }
      if (insertOptions?.focus !== false) {
        focusBlockEditor(createdBlock.id, type === 'toggle' ? 'title' : 'editor');
      }
      if (insertOptions?.registerUndo !== false) {
        recordBlockCommandUndo(previousBlocks, command);
      }
      return createdBlock;
    } catch (e) {
      devLogger.error('[Note] insertBlockAmongSiblings', e);
      setError(e instanceof Error ? e.message : '블록 추가 실패');
      setLoadingState('idle');
      return null;
    }
  }, [blocksRef, documentEngine, focusBlockEditor, recordBlockCommandUndo, selectedId, setBlocks, setError, setLoadingState]);

  const duplicateBlockRecursive = useCallback(async (
    source: NoteBlock,
    parentId: string | null,
    insertIndex: number,
  ): Promise<NoteBlock | null> => {
    const clonedContent = JSON.parse(
      JSON.stringify(source.content ?? defaultBlockContent(source.type)),
    ) as Record<string, unknown>;
    const created = await insertBlockAmongSiblings(parentId, source.type, insertIndex, {
      content: clonedContent,
      focus: false,
      registerUndo: false,
    });
    if (!created) return null;

    const children = getBlocksInParent(blocksRef.current, source.id);
    for (let i = 0; i < children.length; i++) {
      await duplicateBlockRecursive(children[i], created.id, i);
    }
    return created;
  }, [blocksRef, insertBlockAmongSiblings]);

  const handleDuplicateBlock = useCallback(async (block: NoteBlock) => {
    if (!selectedId || block.type === 'page') return;
    const previousBlocks = blocksRef.current;
    const parentId = block.parent_block_id ?? null;
    const siblings = getBlocksInParent(blocksRef.current, parentId);
    const idx = siblings.findIndex((b) => b.id === block.id);
    const insertIndex = idx >= 0 ? idx + 1 : siblings.length;
    const created = await duplicateBlockRecursive(block, parentId, insertIndex);
    if (created) {
      const nextBlocks = blocksRef.current;
      recordBlockTransactionUndo(
        previousBlocks,
        nextBlocks,
        collectBlockTransactionIds(previousBlocks, nextBlocks),
      );
      focusBlockEditor(created.id);
    }
  }, [
    blocksRef,
    duplicateBlockRecursive,
    focusBlockEditor,
    recordBlockTransactionUndo,
    selectedId,
  ]);

  const handleInsertBlockAfter = useCallback(async (
    afterBlock: NoteBlock,
    type: NoteBlock['type'] = 'text',
    content?: Record<string, unknown>,
  ) => {
    if (type === 'page') {
      if (!selectedId) return;
      await handleCreateSubPage(selectedId, {
        insertAfterBlockId: afterBlock.id,
        parentBlockId: afterBlock.parent_block_id ?? null,
        navigateToChild: false,
      });
      return;
    }
    const parentId = afterBlock.parent_block_id ?? null;
    const siblings = blocksRef.current
      .filter((b) => (b.parent_block_id ?? null) === parentId)
      .sort((a, b) => a.order_index - b.order_index);
    const afterIndex = siblings.findIndex((b) => b.id === afterBlock.id);
    const insertIndex = afterIndex >= 0 ? afterIndex + 1 : siblings.length;
    await insertBlockAmongSiblings(parentId, type, insertIndex, content ? { content } : undefined);
  }, [blocksRef, handleCreateSubPage, insertBlockAmongSiblings, selectedId]);

  const handleInsertBlockInParent = useCallback(async (
    parentBlockId: string,
    type: NoteBlock['type'] = 'text',
    content?: Record<string, unknown>,
  ) => {
    if (!selectedId) return;
    if (type === 'page') {
      const siblings = blocksRef.current
        .filter((b) => b.parent_block_id === parentBlockId)
        .sort((a, b) => a.order_index - b.order_index);
      const focusedId = focusedEditorBlockIdRef.current ?? focusedEditorBlockId;
      const focusedChild = focusedId
        ? siblings.find((b) => b.id === focusedId) ?? null
        : null;
      if (focusedChild) {
        await handleCreateSubPage(selectedId, {
          insertAfterBlockId: focusedChild.id,
          parentBlockId,
          navigateToChild: false,
        });
        return;
      }
      if (focusedId === parentBlockId) {
        await handleCreateSubPage(selectedId, {
          parentBlockId,
          insertIndex: 0,
          navigateToChild: false,
        });
        return;
      }
      const lastSibling = siblings[siblings.length - 1];
      if (lastSibling) {
        await handleCreateSubPage(selectedId, {
          insertAfterBlockId: lastSibling.id,
          parentBlockId,
          navigateToChild: false,
        });
      } else {
        await handleCreateSubPage(selectedId, { parentBlockId, navigateToChild: false });
      }
      return;
    }
    const parent = blocksRef.current.find((b) => b.id === parentBlockId);
    if (parent?.type === 'toggle') {
      const parentContent = (parent.content ?? {}) as Record<string, unknown>;
      if (parentContent.collapsed) {
        handleUpdateBlock(parent, { ...parentContent, collapsed: false });
      }
    }
    const siblings = blocksRef.current
      .filter((b) => b.parent_block_id === parentBlockId)
      .sort((a, b) => a.order_index - b.order_index);
    const focusedId = focusedEditorBlockIdRef.current ?? focusedEditorBlockId;
    const focusedChild = focusedId
      ? siblings.find((b) => b.id === focusedId) ?? null
      : null;
    if (focusedChild) {
      await handleInsertBlockAfter(focusedChild, type, content);
      return;
    }
    if (focusedId === parentBlockId) {
      await insertBlockAmongSiblings(parentBlockId, type, 0, content ? { content } : undefined);
      return;
    }
    if (siblings.length > 0) {
      await handleInsertBlockAfter(siblings[siblings.length - 1], type, content);
      return;
    }
    await insertBlockAmongSiblings(parentBlockId, type, 0, content ? { content } : undefined);
  }, [
    blocksRef,
    focusedEditorBlockId,
    focusedEditorBlockIdRef,
    handleCreateSubPage,
    handleInsertBlockAfter,
    handleUpdateBlock,
    insertBlockAmongSiblings,
    selectedId,
  ]);

  const ensureMinimumRootTextBlock = useCallback(async () => {
    if (!selectedId || ensuringMinimumBlockRef.current) return;
    const roots = sortRootBlocks(
      blocksRef.current.filter(
        (b) => b.document_id === selectedId && (b.parent_block_id ?? null) === null,
      ),
    );
    if (roots.length > 0) return;
    ensuringMinimumBlockRef.current = true;
    try {
      const latestRoots = sortRootBlocks(
        blocksRef.current.filter(
          (b) => b.document_id === selectedId && (b.parent_block_id ?? null) === null,
        ),
      );
      if (latestRoots.length > 0) return;
      await insertBlockAmongSiblings(null, 'text', 0, { focus: true });
    } finally {
      ensuringMinimumBlockRef.current = false;
    }
  }, [blocksRef, insertBlockAmongSiblings, selectedId]);

  const handleAddBlock = useCallback(async (type: NoteBlock['type']) => {
    if (!selectedId) return;
    try {
      if (type === 'image' && focusedToggleId) {
        const target = blocks.find((b) => b.id === focusedToggleId);
        if (target?.type === 'toggle') {
          const c = (target.content ?? {}) as Record<string, unknown>;
          const rawIm = c.images;
          const imgs = Array.isArray(rawIm) ? rawIm.map((u) => (typeof u === 'string' ? u : '')) : [];
          handleUpdateBlock(target, { ...c, collapsed: false, images: [...imgs, ''] });
          return;
        }
      }
      if (type === 'page') {
        await handleCreateSubPage(selectedId, {
          parentBlockId: focusedToggleId ?? null,
          navigateToChild: false,
        });
        return;
      }

      setLoadingState('saving');
      const parentBlockId = focusedToggleId ?? null;
      if (parentBlockId) {
        await handleInsertBlockInParent(parentBlockId, type);
        return;
      }

      const defaultContent = defaultBlockContent(type);
      const createdBlock = await documentEngine.persistCreateBlock({
        documentId: selectedId,
        blockType: type,
        content: defaultContent as Record<string, unknown>,
        parent_block_id: null,
      });
      const command = buildInsertBlockCommand(
        blocksRef.current,
        createdBlock,
        null,
        0,
      );
      const previousBlocks = blocksRef.current;
      setBlocks(command.nextBlocks);
      if (command.orders.length > 0) {
        void documentEngine.persistReorder({ orders: command.orders }).catch((e) => {
          devLogger.error('[Note] normalizeAddBlockOrder', e);
        });
      }
      focusBlockEditor(createdBlock.id, type === 'toggle' ? 'title' : 'editor');
      recordBlockCommandUndo(previousBlocks, command);
    } catch (e) {
      devLogger.error('[Note] addBlock', e);
      setError(e instanceof Error ? e.message : '추가 실패');
    }
  }, [
    blocks,
    focusBlockEditor,
    focusedToggleId,
    documentEngine,
    handleCreateSubPage,
    handleInsertBlockInParent,
    handleUpdateBlock,
    recordBlockCommandUndo,
    selectedId,
    setBlocks,
    setError,
    setLoadingState,
  ]);

  return {
    insertBlockAmongSiblings,
    handleDuplicateBlock,
    handleInsertBlockAfter,
    handleInsertBlockInParent,
    handleAddBlock,
    ensureMinimumRootTextBlock,
  };
}
