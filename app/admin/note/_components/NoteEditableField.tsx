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
  setActiveEditorBridge,
} from '../_lib/noteActiveEditorBridge';
import { BlockTextPreview } from './blocks/BlockTextPreview';
import { parseAdminNoteDocumentIdFromHref } from '../_lib/notePaste';
import type { NoteEditor } from './NoteEditor';
import type { NoteEditorEnterContext } from './NoteEditor';
import type { MarkdownBlockTrigger } from './noteBulletInput';
import { normalizeListBlockContentRecord } from './noteBulletInput';
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
    position: { top: number; left: number },
  ) => void;
  onHideFormatToolbar?: () => void;
  onSlashChange?: (show: boolean, query: string) => void;
  uploadImage?: (file: File) => Promise<string>;
  onOpenDocumentById?: (documentId: string) => void;
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
  const resolvedContent = (blockType === 'bulletList' || blockType === 'numberedList')
    ? normalizeListBlockContentRecord((content ?? {}) as Record<string, unknown>)
    : content;
  const shouldMountEditor = isActiveEditor || autoFocusSignal > 0;
  const [editorSurfaceReady, setEditorSurfaceReady] = useState(false);
  const previewText = typeof resolvedContent?.[field] === 'string'
    ? String(resolvedContent[field])
    : text;
  const showPreviewOverlay = shouldMountEditor && !editorSurfaceReady;
  const showPreviewOnly = !shouldMountEditor;
  const resolvedEditorBackspace =
    onEditorBackspace === false ? undefined : onEditorBackspace;

  const activateEditor = () => {
    setActiveEditor({ blockId, field });
    onFocusBlock?.();
  };

  const handleChange = ({ text: nextText, html: nextHtml }: { text: string; html: string }) => {
    const htmlKey = field === 'body' ? 'bodyHtml' : 'html';
    const legacyKey = field === 'body' ? 'legacyBody' : 'legacyText';
    let nextContent: Record<string, unknown> = {
      ...(resolvedContent ?? {}),
      [field]: nextText,
      [htmlKey]: nextHtml,
    };
    const original = resolvedContent?.[field];
    if (typeof resolvedContent?.[legacyKey] !== 'string' && typeof original === 'string') {
      nextContent[legacyKey] = original;
    }
    if (blockType === 'bulletList' || blockType === 'numberedList') {
      nextContent = normalizeListBlockContentRecord(nextContent);
    }
    if (onContentSync) onContentSync(nextContent);
    else onUpdate(nextContent);
  };

  const editorProps: ComponentProps<typeof NoteEditor> = {
    content: resolvedContent,
    field,
    text,
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
      content={resolvedContent}
      field={field}
      text={previewText}
      className={textClassName}
      placeholder={placeholder}
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
        setActiveEditor({ blockId, field });
        activateEditor();
      }}
    >
      {shouldMountEditor ? (
        <div className="relative">
          <div
            ref={slotRef}
            className={`note-rich-editor-slot ${textClassName}`}
          />
          {showPreviewOverlay ? (
            <div className="pointer-events-none absolute inset-0 z-[1]">
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
