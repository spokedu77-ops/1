'use client';

import type { InlineMark } from '@/app/lib/note/inlineMarkup';
import type { PastedBlockSpec } from '../_lib/notePasteBlocks';
import {
  bulletListNestLevelAmongContainers,
  getBlocksInParent,
  numberedListIndexAmongSiblings,
  planMergeWithPreviousBlock,
} from '@/app/lib/note/noteBlockTree';
import {
  MemoSortableBlockRow,
  MemoToggleInlineRow,
} from '../_components/blocks/NoteBlockRows';
import { DocItem } from '../_components/sidebar/NoteDocChrome';
import type { NoteBlock, NoteDocument } from '../_lib/types';
import type { BlockDropTarget } from '../_components/noteContexts';
import { useCallback, useRef, type ReactNode } from 'react';
import { prefetchNoteDocumentBlocks } from '../_lib/noteDocumentBlocksPrefetch';
import {
  createNotionEmptyBackspaceHandler,
  readToggleTitleText,
  resolveToggleChildBackspaceAtStartAction,
  resolveToggleChildEmptyBackspaceAction,
} from '../_lib/noteNotionBlockBehavior';

function buildNotionBackspaceProps(block: NoteBlock, deps: NoteBlockRendererDeps) {
  const canMergeWithPrevious = () => !!planMergeWithPreviousBlock(deps.blocksRef.current, block.id);
  const parentBlock = block.parent_block_id
    ? deps.blocksRef.current.find((item) => item.id === block.parent_block_id)
    : null;
  const parentBlockType = parentBlock?.type ?? null;
  const isFirstChildInToggle = parentBlockType === 'toggle'
    && block.parent_block_id != null
    && !canMergeWithPrevious();

  const focusParentToggleTitle = () => {
    if (!parentBlock || parentBlock.type !== 'toggle') return;
    const title = readToggleTitleText(parentBlock.content as Record<string, unknown>);
    deps.focusBlockEditor(parentBlock.id, 'title', title.length);
  };

  return {
    canMergeWithPrevious,
    onBackspaceAtBlockStart: () => {
      const action = resolveToggleChildBackspaceAtStartAction({
        parentBlockType,
        isFirstChildInToggle,
      });
      if (action.kind === 'focus-toggle-title') {
        focusParentToggleTitle();
        return true;
      }
      return false;
    },
    onEmptyBackspace: () => {
      const action = resolveToggleChildEmptyBackspaceAction({
        parentBlockType,
        isFirstChildInToggle,
        canMergeWithPrevious: canMergeWithPrevious(),
      });
      if (action.kind === 'delete-and-focus-toggle-title') {
        void deps.handleDeleteBlock(block, false).then(() => {
          focusParentToggleTitle();
        });
        return;
      }
      createNotionEmptyBackspaceHandler({
        canMergeWithPrevious,
        onMergeWithPrevious: () => { void deps.handleMergeWithPreviousBlock(block); },
        onDeleteEmptyBlock: () => deps.handleDeleteBlock(block, true),
      })();
    },
    onMergeWithPrevious: () => { void deps.handleMergeWithPreviousBlock(block); },
  };
}

export type NoteBlockRendererDeps = {
  blocks: NoteBlock[];
  blocksRef: React.MutableRefObject<NoteBlock[]>;
  childrenByParent: Map<string, NoteDocument[]>;
  childrenByParentBlock: Map<string, NoteBlock[]>;
  selectedId: string | null;
  expandedSidebarDocs: Set<string>;
  toggleSidebarDocExpanded: (docId: string) => void;
  handleSelectDocument: (doc: NoteDocument) => void;
  handleTogglePin: (e: React.MouseEvent, doc: NoteDocument) => void;
  handleToggleFavorite: (e: React.MouseEvent, doc: NoteDocument) => void;
  handleDeleteDocument: (e: React.MouseEvent, doc: NoteDocument) => void;
  handleCreateDocument: (parentId?: string | null) => void | Promise<void>;
  openSidebarIconPicker: (doc: NoteDocument, e: React.MouseEvent<Element>) => void;
  focusedEditorBlockId: string | null;
  focusedEditorPart: 'title' | 'editor' | null;
  focusSignal: number;
  focusTitleSignal: number;
  focusedToggleId: string | null;
  setFocusedToggleId: (id: string | null) => void;
  mergeFocusCaretOffset: number | undefined;
  requestCaretOffset: (offset: number) => void;
  dropTarget: BlockDropTarget;
  resolvePageIcon: (documentId: string) => string | null | undefined;
  handleUpdateBlock: (block: NoteBlock, content: NoteBlock['content']) => void;
  syncBlockContent: (blockId: string, content: NoteBlock['content']) => void;
  handleDeleteBlock: (block: NoteBlock, fromEmptyBackspace?: boolean) => void | Promise<void>;
  handleChangeBlockType: (block: NoteBlock, type: NoteBlock['type']) => void;
  handleInsertBlockAfter: (block: NoteBlock, type?: NoteBlock['type'], content?: NoteBlock['content']) => void;
  handleSplitListBlockAfterWithChildren: (
    block: NoteBlock,
    type?: NoteBlock['type'],
    content?: NoteBlock['content'],
  ) => void;
  handleInsertBlockInParent: (parentId: string, type?: NoteBlock['type'], content?: Record<string, unknown>) => void;
  handleOpenDocumentById: (documentId: string) => void;
  showFormatToolbar: (
    applyMark: (mark: InlineMark) => void,
    applyTextStyle: (style: 'paragraph' | 'heading1' | 'heading2' | 'heading3') => void,
    applyTextColor: (color: string | null) => void,
    applyHighlight: (color: string | null) => void,
    position: { top: number; left: number },
    insertTable?: () => void,
    editLink?: () => void,
  ) => void;
  hideFormatToolbar: () => void;
  handleMultilinePaste: (block: NoteBlock, specs: PastedBlockSpec[]) => void | Promise<void>;
  handleMergeWithPreviousBlock: (block: NoteBlock) => void | Promise<void>;
  handleDuplicateBlock: (block: NoteBlock) => void | Promise<void>;
  handleCopyBlockLink: (block: NoteBlock) => void;
  recordBlockUndo: (blockIds: string[]) => void;
  handleIndentBlock: (block: NoteBlock, direction: 'in' | 'out') => void;
  handleNavigateBlock: (block: NoteBlock, direction: 'previous' | 'next') => void;
  trackActiveBlock: (blockId: string | null, part?: 'title' | 'editor') => void;
  uploadNoteImage: (file: File) => Promise<string>;
  focusBlockEditor: (
    blockId: string | null,
    part?: 'title' | 'editor',
    caretOffset?: number,
    options?: { preventScroll?: boolean },
  ) => void;
};

export function useNoteBlockRenderers(deps: NoteBlockRendererDeps) {
  const depsRef = useRef(deps);
  depsRef.current = deps;

  const renderDocumentTree = useCallback(function renderDocumentTree(doc: NoteDocument, depth = 0): ReactNode {
    const deps = depsRef.current;
    const children = deps.childrenByParent.get(doc.id) ?? [];
    const isExpanded = deps.expandedSidebarDocs.has(doc.id);
    return (
      <div key={doc.id} className="space-y-0.5">
        <DocItem
          doc={doc}
          isActive={doc.id === deps.selectedId}
          indentLevel={depth}
          hasChildren={children.length > 0}
          isExpanded={isExpanded}
          isChildDoc={depth > 0}
          onToggleExpand={() => deps.toggleSidebarDocExpanded(doc.id)}
          onSelect={() => deps.handleSelectDocument(doc)}
          onPrefetchHover={
            doc.id !== deps.selectedId
              ? () => prefetchNoteDocumentBlocks(doc.id)
              : undefined
          }
          onPin={(e) => deps.handleTogglePin(e, doc)}
          onFavorite={(e) => deps.handleToggleFavorite(e, doc)}
          onDelete={(e) => deps.handleDeleteDocument(e, doc)}
          onCreateChild={(e) => { e.stopPropagation(); void deps.handleCreateDocument(doc.id); }}
          onEditIcon={(e) => deps.openSidebarIconPicker(doc, e)}
        />
        {children.length > 0 && isExpanded && (
          <div className="space-y-0.5">
            {children.map((child) => renderDocumentTree(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }, []);

  const renderToggleInlineChild = useCallback(function renderToggleInlineChild(block: NoteBlock, nestDepth = 1): ReactNode {
    const deps = depsRef.current;
    const childBlocks = deps.childrenByParentBlock.get(block.id) ?? [];
    const siblings = getBlocksInParent(deps.blocks, block.parent_block_id ?? null);
    const numberedListIndex = block.type === 'numberedList'
      ? numberedListIndexAmongSiblings(block, siblings)
      : undefined;
    const bulletListNestLevel = block.type === 'bulletList'
      ? bulletListNestLevelAmongContainers(block, deps.blocks)
      : undefined;
    const backspaceProps = buildNotionBackspaceProps(block, deps);
    return (
      <MemoToggleInlineRow
        key={block.id}
        block={block}
        nestDepth={nestDepth}
        childBlocks={childBlocks}
        numberedListIndex={numberedListIndex}
        bulletListNestLevel={bulletListNestLevel}
        renderChildBlock={renderToggleInlineChild}
        onContentPatch={(content) => deps.syncBlockContent(block.id, content)}
        onDelete={() => deps.handleDeleteBlock(block)}
        onChangeType={(type) => deps.handleChangeBlockType(block, type)}
        onEnter={() => deps.handleInsertBlockAfter(block, 'text')}
        onAddBelow={(type, content) => { void deps.handleInsertBlockAfter(block, type ?? block.type, content); }}
        onSplitWithChildren={(type, content) => { void deps.handleSplitListBlockAfterWithChildren(block, type ?? block.type, content); }}
        onOpenDocument={deps.handleOpenDocumentById}
        onShowFormatToolbar={deps.showFormatToolbar}
        onHideFormatToolbar={deps.hideFormatToolbar}
        onMultilinePaste={(specs) => { void deps.handleMultilinePaste(block, specs); }}
        autoFocusSignal={
          deps.focusedEditorBlockId === block.id && deps.focusedEditorPart !== 'title' ? deps.focusSignal : 0
        }
        autoFocusTitleSignal={
          deps.focusedEditorBlockId === block.id && deps.focusedEditorPart === 'title' ? deps.focusTitleSignal : 0
        }
        onEmptyBackspace={backspaceProps.onEmptyBackspace}
        onBackspaceAtBlockStart={backspaceProps.onBackspaceAtBlockStart}
        onMergeWithPrevious={backspaceProps.onMergeWithPrevious}
        canMergeWithPrevious={backspaceProps.canMergeWithPrevious}
        onDuplicate={() => { void deps.handleDuplicateBlock(block); }}
        onCopyBlockLink={() => deps.handleCopyBlockLink(block)}
        onRecordBlockUndo={() => deps.recordBlockUndo([block.id])}
        onIndentChange={(direction) => deps.handleIndentBlock(block, direction)}
        onNavigatePrevious={() => deps.handleNavigateBlock(block, 'previous')}
        onNavigateNext={() => deps.handleNavigateBlock(block, 'next')}
        focusedToggleId={deps.focusedToggleId}
        onTrackActiveBlock={(part) => deps.trackActiveBlock(block.id, part)}
        uploadImage={deps.uploadNoteImage}
        isDropTarget={deps.dropTarget?.blockId === block.id && deps.dropTarget?.position === 'inside'}
        resolvePageIcon={(documentId) => deps.resolvePageIcon(documentId) ?? null}
        isFocused={deps.focusedEditorBlockId === block.id}
        mergeFocusCaretOffset={deps.focusedEditorBlockId === block.id ? deps.mergeFocusCaretOffset : undefined}
        onRequestCaretOffset={deps.requestCaretOffset}
        onFocusBlock={() => deps.focusBlockEditor(block.id)}
        onFocusBlockById={(id: string, part?: 'title' | 'editor', offset?: number) => deps.focusBlockEditor(id, part, offset)}
        onAddChildBelow={
          block.type === 'toggle' || block.type === 'column'
            ? (type, content) => { void deps.handleInsertBlockInParent(block.id, type ?? 'text', content); }
            : undefined
        }
        lookupChildBlocks={(parentId) => deps.childrenByParentBlock.get(parentId) ?? []}
        onAddChildInColumn={(columnId, type, content) => {
          void deps.handleInsertBlockInParent(columnId, type ?? 'text', content);
        }}
      />
    );
  }, []);

  const renderSortableBlock = useCallback(function renderSortableBlock(block: NoteBlock): ReactNode {
    const deps = depsRef.current;
    const childBlocks = deps.childrenByParentBlock.get(block.id) ?? [];
    const siblings = getBlocksInParent(deps.blocks, block.parent_block_id ?? null);
    const numberedListIndex = block.type === 'numberedList'
      ? numberedListIndexAmongSiblings(block, siblings)
      : undefined;
    const bulletListNestLevel = block.type === 'bulletList'
      ? bulletListNestLevelAmongContainers(block, deps.blocks)
      : undefined;
    const backspaceProps = buildNotionBackspaceProps(block, deps);
    return (
      <MemoSortableBlockRow
        key={block.id}
        block={block}
        childBlocks={childBlocks}
        numberedListIndex={numberedListIndex}
        bulletListNestLevel={bulletListNestLevel}
        renderChildBlock={renderToggleInlineChild}
        onAddChildBelow={(type, content) => { void deps.handleInsertBlockInParent(block.id, type ?? 'text', content); }}
        onContentPatch={(content) => deps.syncBlockContent(block.id, content)}
        onDelete={() => deps.handleDeleteBlock(block)}
        onChangeType={(type) => deps.handleChangeBlockType(block, type)}
        onEnter={() => deps.handleInsertBlockAfter(block, 'text')}
        onAddBelow={(type, content) => { void deps.handleInsertBlockAfter(block, type ?? block.type, content); }}
        onSplitWithChildren={(type, content) => { void deps.handleSplitListBlockAfterWithChildren(block, type ?? block.type, content); }}
        onOpenDocument={deps.handleOpenDocumentById}
        onShowFormatToolbar={deps.showFormatToolbar}
        onHideFormatToolbar={deps.hideFormatToolbar}
        onMultilinePaste={(specs) => { void deps.handleMultilinePaste(block, specs); }}
        autoFocusSignal={
          deps.focusedEditorBlockId === block.id && deps.focusedEditorPart !== 'title' ? deps.focusSignal : 0
        }
        autoFocusTitleSignal={
          deps.focusedEditorBlockId === block.id && deps.focusedEditorPart === 'title' ? deps.focusTitleSignal : 0
        }
        onEmptyBackspace={backspaceProps.onEmptyBackspace}
        onBackspaceAtBlockStart={backspaceProps.onBackspaceAtBlockStart}
        onMergeWithPrevious={backspaceProps.onMergeWithPrevious}
        canMergeWithPrevious={backspaceProps.canMergeWithPrevious}
        onDuplicate={() => { void deps.handleDuplicateBlock(block); }}
        onCopyBlockLink={() => deps.handleCopyBlockLink(block)}
        onRecordBlockUndo={() => deps.recordBlockUndo([block.id])}
        onIndentChange={(direction) => deps.handleIndentBlock(block, direction)}
        onNavigatePrevious={() => deps.handleNavigateBlock(block, 'previous')}
        onNavigateNext={() => deps.handleNavigateBlock(block, 'next')}
        focusedToggleId={deps.focusedToggleId}
        onTrackActiveBlock={(part) => deps.trackActiveBlock(block.id, part)}
        uploadImage={deps.uploadNoteImage}
        isDropTarget={deps.dropTarget?.blockId === block.id && deps.dropTarget?.position === 'inside'}
        resolvePageIcon={(documentId) => deps.resolvePageIcon(documentId) ?? null}
        isFocused={deps.focusedEditorBlockId === block.id}
        mergeFocusCaretOffset={deps.focusedEditorBlockId === block.id ? deps.mergeFocusCaretOffset : undefined}
        onRequestCaretOffset={deps.requestCaretOffset}
        onFocusBlock={() => deps.focusBlockEditor(block.id)}
        onFocusBlockById={(id: string, part?: 'title' | 'editor', offset?: number) => deps.focusBlockEditor(id, part, offset)}
        lookupChildBlocks={(parentId) => deps.childrenByParentBlock.get(parentId) ?? []}
        onAddChildInColumn={(columnId, type, content) => {
          void deps.handleInsertBlockInParent(columnId, type ?? 'text', content);
        }}
      />
    );
  }, [renderToggleInlineChild]);

  return { renderDocumentTree, renderSortableBlock };
}
