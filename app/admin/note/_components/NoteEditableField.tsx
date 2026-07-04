'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ComponentProps } from 'react';
import type { InlineMark } from '@/app/lib/note/inlineMarkup';
import type { PastedBlockSpec } from '../_lib/notePasteBlocks';
import {
  useIsNoteActiveEditor,
  useNoteBlockContent,
  useNoteBlockStore,
  type NoteActiveEditorField,
} from '../_store/noteBlockStore';
import {
  notePointerTargetElement,
  stopNoteEditorPointerBubble,
} from '../_lib/notePointerTarget';
import {
  clearActiveEditorBridge,
  setActiveEditorBridge,
} from '../_lib/noteActiveEditorBridge';
import { BlockTextPreview } from './blocks/BlockTextPreview';
import type { NoteEditor } from './NoteEditor';
import type { NoteEditorEnterContext } from './NoteEditor';
import type { MarkdownBlockTrigger } from './noteBulletInput';
import {
  stripListItemMarkerFromHtml,
  stripListItemMarkerPrefix,
} from './noteBulletInput';
import {
  getTableCell,
  parseTableCellField,
  patchTableCell,
} from '../_lib/noteTableBlock';
import { canSplitMultilinePasteToBlocks } from '../_lib/noteMultilinePaste';
import {
  getNoteEditor,
  scheduleFocusNoteEditorAtClick,
  setPendingEditorClick,
} from './noteEditorRegistry';
import { clearAllNoteTextSelections } from './noteCrossSelect';

type NoteEditableFieldProps = {
  blockId: string;
  blockType: string;
  field?: NoteActiveEditorField;
  fallbackContent: Record<string, unknown> | null | undefined;
  text: string;
  placeholder: string;
  textClassName: string;
  autoFocusSignal?: number;
  enterCreatesBlock?: boolean;
  enterSplitOnMidBlock?: boolean;
  tabBehavior?: 'block-indent' | 'insert-text-indent' | 'table-cell-nav';
  onEditorEnter?: (ctx?: NoteEditorEnterContext) => void;
  onEditorBackspace?: (() => void) | false;
  onEditorBackspaceAtBlockStart?: () => boolean;
  onEditorMergeWithPrevious?: () => void;
  onEditorCanMergeWithPrevious?: () => boolean;
  editorMergeFocusCaretOffset?: number;
  mergeFocusCaretOffset?: number;
  onIndentChange?: (direction: 'in' | 'out') => void;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  onTrackActiveBlock?: (part: 'title' | 'editor') => void;
  onFocusBlock?: () => void;
  onContentPatch?: (content: Record<string, unknown>) => void;
  onContentSync?: (content: Record<string, unknown>) => void;
  onUpdate?: (content: Record<string, unknown>) => void;
  onChangeType?: (trigger: MarkdownBlockTrigger) => void;
  onShowFormatToolbar?: (
    applyMark: (mark: InlineMark) => void,
    applyTextStyle: (style: 'paragraph' | 'heading1' | 'heading2' | 'heading3') => void,
    applyTextColor: (color: string | null) => void,
    applyHighlight: (color: string | null) => void,
    position: { top: number; left: number },
    insertTable?: () => void,
    editLink?: () => void,
  ) => void;
  onHideFormatToolbar?: () => void;
  onSlashChange?: (show: boolean, query: string) => void;
  uploadImage?: (file: File) => Promise<string>;
  onOpenDocumentById?: (documentId: string) => void;
  onMultilinePaste?: (specs: PastedBlockSpec[]) => void;
  slashHostRef?: React.RefObject<HTMLDivElement | null>;
};

/**
 * 노션 방식: 활성 블록·필드 1개만 TipTap(싱글톤 호스트), 나머지는 정적 미리보기.
 */
export function NoteEditableField({
  blockId,
  blockType,
  field = 'text',
  fallbackContent,
  text,
  placeholder,
  textClassName,
  autoFocusSignal = 0,
  enterCreatesBlock = false,
  enterSplitOnMidBlock = false,
  tabBehavior = 'block-indent',
  onEditorEnter,
  onEditorBackspace,
  onEditorBackspaceAtBlockStart,
  onEditorMergeWithPrevious,
  onEditorCanMergeWithPrevious,
  editorMergeFocusCaretOffset,
  mergeFocusCaretOffset,
  onIndentChange,
  onNavigatePrevious,
  onNavigateNext,
  onTrackActiveBlock,
  onFocusBlock,
  onContentPatch,
  onContentSync,
  onUpdate,
  onChangeType,
  onShowFormatToolbar,
  onHideFormatToolbar,
  onSlashChange,
  uploadImage,
  onOpenDocumentById,
  onMultilinePaste,
  slashHostRef: externalSlashHostRef,
}: NoteEditableFieldProps) {
  const internalSlashHostRef = useRef<HTMLDivElement>(null);
  const slashHostRef = externalSlashHostRef ?? internalSlashHostRef;
  const slotRef = useRef<HTMLDivElement>(null);
  const editorPropsRef = useRef<ComponentProps<typeof NoteEditor> | null>(null);
  const editorReadyRafRef = useRef<number | null>(null);
  const storeContent = useNoteBlockContent(blockId);
  const isActiveEditor = useIsNoteActiveEditor(blockId, field);
  const setActiveEditor = useNoteBlockStore((state) => state.setActiveEditor);

  const content = storeContent ?? fallbackContent;
  const resolvedContent = content;
  const shouldMountEditor = isActiveEditor;
  const [editorSurfaceReady, setEditorSurfaceReady] = useState(false);
  const cellRefForEditor = parseTableCellField(field);
  const rawPreviewText = cellRefForEditor && blockType === 'table'
    ? getTableCell(resolvedContent as Record<string, unknown>, cellRefForEditor.row, cellRefForEditor.col).text
    : typeof resolvedContent?.[field] === 'string'
      ? String(resolvedContent[field])
      : text;
  const isListBlock = blockType === 'bulletList' || blockType === 'numberedList';
  const previewText = isListBlock
    ? stripListItemMarkerPrefix(rawPreviewText)
    : rawPreviewText;
  const hidePreview = shouldMountEditor && editorSurfaceReady;
  const resolvedEditorBackspace =
    onEditorBackspace === false ? undefined : onEditorBackspace;

  const cancelEditorReadyFrame = useCallback(() => {
    if (editorReadyRafRef.current === null) return;
    cancelAnimationFrame(editorReadyRafRef.current);
    editorReadyRafRef.current = null;
  }, []);

  const markEditorSurfaceReady = useCallback(() => {
    cancelEditorReadyFrame();
    editorReadyRafRef.current = requestAnimationFrame(() => {
      editorReadyRafRef.current = requestAnimationFrame(() => {
        editorReadyRafRef.current = null;
        setEditorSurfaceReady(true);
      });
    });
  }, [cancelEditorReadyFrame]);

  const activateEditor = () => {
    setActiveEditor({ blockId, field });
    onTrackActiveBlock?.('editor');
    onFocusBlock?.();
  };

  const pushContent = onContentPatch ?? onContentSync ?? onUpdate;

  const handleChange = ({ text: nextText, html: nextHtml }: { text: string; html: string }) => {
    if (!pushContent) return;
    const baseContent = (
      useNoteBlockStore.getState().getBlock(blockId)?.content
      ?? fallbackContent
      ?? {}
    ) as Record<string, unknown>;
    const cellRef = parseTableCellField(field);
    if (cellRef && blockType === 'table') {
      const nextContent = patchTableCell(baseContent, cellRef.row, cellRef.col, {
        text: nextText,
        html: nextHtml,
      });
      pushContent(nextContent);
      return;
    }
    const htmlKey = field === 'body' ? 'bodyHtml' : 'html';
    const legacyKey = field === 'body' ? 'legacyBody' : 'legacyText';
    const nextContent: Record<string, unknown> = {
      ...baseContent,
      [field]: nextText,
      [htmlKey]: nextHtml,
    };
    const original = baseContent[field];
    if (typeof baseContent[legacyKey] !== 'string' && typeof original === 'string') {
      nextContent[legacyKey] = original;
    }
    pushContent(nextContent);
  };

  let editorContent: Record<string, unknown> | null | undefined = resolvedContent as Record<string, unknown>;
  let previewContent: Record<string, unknown> | null | undefined = resolvedContent as Record<string, unknown>;
  if (cellRefForEditor && blockType === 'table') {
    const cell = getTableCell(resolvedContent as Record<string, unknown>, cellRefForEditor.row, cellRefForEditor.col);
    editorContent = { text: cell.text, html: cell.html };
    previewContent = editorContent;
  } else if (isListBlock && resolvedContent && typeof resolvedContent.html === 'string') {
    const cleanedHtml = stripListItemMarkerFromHtml(resolvedContent.html);
    if (cleanedHtml !== resolvedContent.html) {
      editorContent = { ...resolvedContent, html: cleanedHtml };
    }
  }

  const resolvedEditorText = rawPreviewText;
  const editorRichField = cellRefForEditor ? 'text' as const : (field === 'body' ? 'body' as const : 'text' as const);

  const editorProps: ComponentProps<typeof NoteEditor> = {
    content: editorContent,
    field: editorRichField,
    text: resolvedEditorText,
    resetKey: `${blockId}:${blockType}:${field}`,
    placeholder,
    className: textClassName,
    onEnter: onEditorEnter ?? (() => {}),
    enterCreatesBlock,
    enterSplitOnMidBlock,
    autoFocusSignal,
    onEmptyBackspace: resolvedEditorBackspace,
    onBackspaceAtBlockStart: onEditorBackspaceAtBlockStart,
    onMergeWithPrevious: onEditorMergeWithPrevious,
    canMergeWithPrevious: onEditorCanMergeWithPrevious,
    onMarkdownBlockTrigger:
      onChangeType
      && (blockType === 'text'
        || blockType === 'heading'
        || blockType === 'heading2'
        || blockType === 'heading3'
        || blockType === 'todo'
        || blockType === 'callout'
        || blockType === 'code')
        ? onChangeType
        : undefined,
    focusCaretOffset: editorMergeFocusCaretOffset ?? mergeFocusCaretOffset,
    onIndent: onIndentChange,
    tabBehavior,
    onNavigatePrevious: onNavigatePrevious,
    onNavigateNext: onNavigateNext,
    onEditorFocus: () => {
      setActiveEditor({ blockId, field });
      onTrackActiveBlock?.('editor');
    },
    onEditorSurfaceReady: markEditorSurfaceReady,
    onSlashChange,
    onShowFormatToolbar,
    onHideFormatToolbar,
    uploadImage,
    onOpenDocumentById,
    onMultilinePaste,
    canSplitMultilinePaste: field === 'text' && canSplitMultilinePasteToBlocks(blockType),
    onChange: handleChange,
  };

  useLayoutEffect(() => {
    editorPropsRef.current = editorProps;
  });

  useLayoutEffect(() => {
    if (!shouldMountEditor || !slotRef.current) {
      clearActiveEditorBridge(blockId, field);
      return;
    }
    setActiveEditorBridge({
      blockId,
      field,
      slotElement: slotRef.current,
      getProps: () => editorPropsRef.current!,
    });
    return () => {
      clearActiveEditorBridge(blockId, field);
    };
  }, [blockId, field, shouldMountEditor]);

  useLayoutEffect(() => {
    if (!shouldMountEditor) {
      cancelEditorReadyFrame();
      setEditorSurfaceReady(false);
      return;
    }
    const isConnected = () => {
      const editor = getNoteEditor(blockId);
      return Boolean(editor?.view?.dom?.isConnected);
    };
    if (isConnected()) {
      markEditorSurfaceReady();
      return;
    }
    cancelEditorReadyFrame();
    setEditorSurfaceReady(false);
    let cancelled = false;
    let framesLeft = 48;
    const waitForEditor = () => {
      if (cancelled) return;
      if (isConnected()) {
        markEditorSurfaceReady();
        return;
      }
      if (framesLeft <= 0) return;
      framesLeft -= 1;
      requestAnimationFrame(waitForEditor);
    };
    requestAnimationFrame(waitForEditor);
    return () => {
      cancelled = true;
    };
  }, [shouldMountEditor, blockId, autoFocusSignal, cancelEditorReadyFrame, markEditorSurfaceReady]);

  useEffect(() => () => {
    cancelEditorReadyFrame();
  }, [cancelEditorReadyFrame]);

  const previewNode = (
    <BlockTextPreview
      blockId={blockId}
      content={previewContent}
      field={editorRichField}
      text={previewText}
      className={textClassName}
      placeholder={placeholder}
      stripListMarkers={isListBlock}
      onRecordClick={(x, y) => setPendingEditorClick(blockId, x, y)}
      onActivate={activateEditor}
      onOpenDocumentById={onOpenDocumentById}
    />
  );

  return (
    <div
      ref={slashHostRef}
      data-note-editor-host
      className="relative min-h-[1.75rem] min-w-0 max-w-full cursor-text select-text"
      onPointerDown={stopNoteEditorPointerBubble}
      onMouseDown={(e) => {
        const target = notePointerTargetElement(e.target);
        if (!target) return;
        if (target.closest('button, input, textarea, a')) return;
        if (!isActiveEditor) {
          useNoteBlockStore.getState().setActiveEditor({ blockId, field });
        }
        setPendingEditorClick(blockId, e.clientX, e.clientY);
        if (target.closest('.ProseMirror')) return;
        clearAllNoteTextSelections();
        const existing = getNoteEditor(blockId);
        if (existing) {
          scheduleFocusNoteEditorAtClick(blockId, existing);
        }
      }}
      onClick={(e) => {
        const target = notePointerTargetElement(e.target);
        if (!target) return;
        if (target.closest('button, input, textarea, a, .ProseMirror')) return;
        activateEditor();
      }}
    >
      <div className="relative min-h-[1.75rem] min-w-0 w-full">
        {shouldMountEditor ? (
          <div
            ref={slotRef}
            className={`note-rich-editor-slot min-w-0 w-full ${textClassName} ${
              hidePreview ? '' : 'opacity-0'
            }`}
            aria-hidden={!hidePreview}
          />
        ) : null}
        <div
          className={
            hidePreview
              ? 'hidden'
              : shouldMountEditor
                ? 'pointer-events-none absolute inset-0 overflow-visible'
                : undefined
          }
          aria-hidden={hidePreview}
        >
          {previewNode}
        </div>
      </div>
    </div>
  );
}
