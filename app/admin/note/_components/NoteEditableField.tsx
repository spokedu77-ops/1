'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ComponentProps } from 'react';
import type { InlineMark } from '@/app/lib/note/inlineMarkup';
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
  getActiveEditorBridgeSnapshot,
  setActiveEditorBridge,
} from '../_lib/noteActiveEditorBridge';
import { BlockTextPreview } from './blocks/BlockTextPreview';
import { parseAdminNoteDocumentIdFromHref } from '../_lib/notePaste';
import type { NoteEditor } from './NoteEditor';
import type { NoteEditorEnterContext } from './NoteEditor';
import type { MarkdownBlockTrigger } from './noteBulletInput';
import {
  normalizeListBlockContentRecord,
  stripListItemMarkerFromHtml,
  stripListItemMarkerPrefix,
} from './noteBulletInput';
import { commitActiveNoteEditorToStore } from '../_lib/noteBlockStateMerge';
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
  tabBehavior?: 'block-indent' | 'insert-text-indent';
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
  onContentSync?: (content: Record<string, unknown>) => void;
  onUpdate: (content: Record<string, unknown>) => void;
  onChangeType?: (trigger: MarkdownBlockTrigger) => void;
  onShowFormatToolbar?: (
    applyMark: (mark: InlineMark) => void,
    applyTextStyle: (style: 'paragraph' | 'heading1' | 'heading2' | 'heading3') => void,
    applyTextColor: (color: string | null) => void,
    applyHighlight: (color: string | null) => void,
    position: { top: number; left: number },
  ) => void;
  onHideFormatToolbar?: () => void;
  onSlashChange?: (show: boolean, query: string) => void;
  uploadImage?: (file: File) => Promise<string>;
  onOpenDocumentById?: (documentId: string) => void;
  onMultilinePaste?: (lines: string[]) => void;
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
  const storeContent = useNoteBlockContent(blockId);
  const isActiveEditor = useIsNoteActiveEditor(blockId, field);
  const setActiveEditor = useNoteBlockStore((state) => state.setActiveEditor);

  const content = storeContent ?? fallbackContent;
  const resolvedContent = content;
  const shouldMountEditor = isActiveEditor;
  const [editorSurfaceReady, setEditorSurfaceReady] = useState(false);
  const rawPreviewText = typeof resolvedContent?.[field] === 'string'
    ? String(resolvedContent[field])
    : text;
  const isListBlock = blockType === 'bulletList' || blockType === 'numberedList';
  const previewText = isListBlock
    ? stripListItemMarkerPrefix(rawPreviewText)
    : rawPreviewText;
  const resolvedEditorText = rawPreviewText;
  const showPreviewOverlay = shouldMountEditor && !editorSurfaceReady;
  const showPreviewOnly = !shouldMountEditor;
  const resolvedEditorBackspace =
    onEditorBackspace === false ? undefined : onEditorBackspace;

  const activateEditor = () => {
    setActiveEditor({ blockId, field });
    onTrackActiveBlock?.('editor');
    onFocusBlock?.();
  };

  const handleChange = ({ text: nextText, html: nextHtml }: { text: string; html: string }) => {
    const htmlKey = field === 'body' ? 'bodyHtml' : 'html';
    const legacyKey = field === 'body' ? 'legacyBody' : 'legacyText';
    const baseContent = (
      useNoteBlockStore.getState().getBlock(blockId)?.content
      ?? fallbackContent
      ?? {}
    ) as Record<string, unknown>;
    let nextContent: Record<string, unknown> = {
      ...baseContent,
      [field]: nextText,
      [htmlKey]: nextHtml,
    };
    const original = baseContent[field];
    if (typeof baseContent[legacyKey] !== 'string' && typeof original === 'string') {
      nextContent[legacyKey] = original;
    }
    if (blockType === 'bulletList' || blockType === 'numberedList') {
      nextContent = normalizeListBlockContentRecord(nextContent);
    }
    if (onContentSync) onContentSync(nextContent);
    else onUpdate(nextContent);
  };

  const handleChangeRef = useRef(handleChange);
  handleChangeRef.current = handleChange;
  const wasEditorMountedRef = useRef(shouldMountEditor);

  let editorContent = resolvedContent;
  if (isListBlock && resolvedContent && typeof resolvedContent.html === 'string') {
    const cleanedHtml = stripListItemMarkerFromHtml(resolvedContent.html);
    if (cleanedHtml !== resolvedContent.html) {
      editorContent = { ...resolvedContent, html: cleanedHtml };
    }
  }

  const editorProps: ComponentProps<typeof NoteEditor> = {
    content: editorContent,
    field,
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
    const wasMounted = wasEditorMountedRef.current;
    wasEditorMountedRef.current = shouldMountEditor;
    if (!wasMounted || shouldMountEditor) return;
    const bridge = getActiveEditorBridgeSnapshot();
    if (bridge && (bridge.blockId !== blockId || bridge.field !== field)) return;
    const editor = getNoteEditor(blockId);
    if (!editor || (editor as { isDestroyed?: boolean }).isDestroyed) return;
    handleChangeRef.current({
      text: editor.getText(),
      html: editor.getHTML(),
    });
  }, [shouldMountEditor, blockId, field]);

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

  useEffect(() => {
    if (!shouldMountEditor) {
      setEditorSurfaceReady(false);
      return;
    }
    let cancelled = false;
    const waitForEditor = (framesLeft: number) => {
      if (cancelled) return;
      const editor = getNoteEditor(blockId);
      if (editor?.view?.dom?.isConnected) {
        setEditorSurfaceReady(true);
        return;
      }
      if (framesLeft <= 0) return;
      requestAnimationFrame(() => waitForEditor(framesLeft - 1));
    };
    setEditorSurfaceReady(false);
    requestAnimationFrame(() => waitForEditor(24));
    return () => {
      cancelled = true;
    };
  }, [shouldMountEditor, blockId, autoFocusSignal]);

  const previewNode = (
    <BlockTextPreview
      blockId={blockId}
      content={resolvedContent}
      field={field}
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
          commitActiveNoteEditorToStore();
        }
        clearAllNoteTextSelections();
        setPendingEditorClick(blockId, e.clientX, e.clientY);
        if (target.closest('.ProseMirror')) return;
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
      {shouldMountEditor ? (
        <div className="relative">
          <div
            ref={slotRef}
            className={`note-rich-editor-slot min-w-0 w-full ${textClassName}`}
          />
          {showPreviewOverlay ? (
            <div className="pointer-events-none absolute inset-0 z-[1] overflow-visible">
              {previewNode}
            </div>
          ) : null}
        </div>
      ) : showPreviewOnly ? (
        previewNode
      ) : null}
    </div>
  );
}
