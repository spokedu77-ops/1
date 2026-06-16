'use client';

import { useRef } from 'react';
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
import { BlockTextPreview } from './blocks/BlockTextPreview';
import { LazyNoteEditor } from './blocks/LazyNoteEditor';
import type { NoteEditorEnterContext } from './NoteEditor';
import type { MarkdownBlockTrigger } from './noteBulletInput';
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
  slashHostRef?: React.RefObject<HTMLDivElement | null>;
};

/**
 * 노션 방식: 활성 블록·필드 1개만 TipTap, 나머지는 정적 미리보기.
 * 스토어 슬라이스만 구독해 타이핑 시 형제 블록 리렌더를 막는다.
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
  slashHostRef: externalSlashHostRef,
}: NoteEditableFieldProps) {
  const internalSlashHostRef = useRef<HTMLDivElement>(null);
  const slashHostRef = externalSlashHostRef ?? internalSlashHostRef;
  const storeContent = useNoteBlockContent(blockId);
  const isActiveEditor = useIsNoteActiveEditor(blockId, field);
  const setActiveEditor = useNoteBlockStore((state) => state.setActiveEditor);

  const content = storeContent ?? fallbackContent;
  const shouldMountEditor = isActiveEditor || autoFocusSignal > 0;
  const htmlKey = field === 'body' ? 'bodyHtml' : 'html';
  const legacyKey = field === 'body' ? 'legacyBody' : 'legacyText';
  const resolvedEditorBackspace =
    onEditorBackspace === false ? undefined : onEditorBackspace;

  const activateEditor = () => {
    setActiveEditor({ blockId, field });
    onFocusBlock?.();
  };

  const handleChange = ({ text: nextText, html: nextHtml }: { text: string; html: string }) => {
    const nextContent: Record<string, unknown> = {
      ...(content ?? {}),
      [field]: nextText,
      [htmlKey]: nextHtml,
    };
    const original = content?.[field];
    if (typeof content?.[legacyKey] !== 'string' && typeof original === 'string') {
      nextContent[legacyKey] = original;
    }
    if (onContentSync) onContentSync(nextContent);
    else onUpdate(nextContent);
  };

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
        <LazyNoteEditor
          content={content}
          field={field}
          text={text}
          resetKey={`${blockId}:${blockType}:${field}`}
          editorBlockId={blockId}
          placeholder={placeholder}
          className={textClassName}
          onEnter={onEditorEnter ?? (() => {})}
          enterCreatesBlock={enterCreatesBlock}
          enterSplitOnMidBlock={enterSplitOnMidBlock}
          autoFocusSignal={autoFocusSignal}
          onEmptyBackspace={resolvedEditorBackspace}
          onBackspaceAtBlockStart={onEditorBackspaceAtBlockStart}
          onMergeWithPrevious={onEditorMergeWithPrevious}
          canMergeWithPrevious={onEditorCanMergeWithPrevious}
          onMarkdownBlockTrigger={
            onChangeType
            && (blockType === 'text'
              || blockType === 'heading'
              || blockType === 'heading2'
              || blockType === 'heading3'
              || blockType === 'todo'
              || blockType === 'callout'
              || blockType === 'code'
              || blockType === 'bulletList'
              || blockType === 'numberedList')
              ? onChangeType
              : undefined
          }
          focusCaretOffset={editorMergeFocusCaretOffset ?? mergeFocusCaretOffset}
          onIndent={onIndentChange}
          tabBehavior={tabBehavior}
          onNavigatePrevious={onNavigatePrevious}
          onNavigateNext={onNavigateNext}
          onEditorFocus={() => {
            setActiveEditor({ blockId, field });
            onTrackActiveBlock?.('editor');
          }}
          onSlashChange={onSlashChange}
          onShowFormatToolbar={onShowFormatToolbar}
          onHideFormatToolbar={onHideFormatToolbar}
          uploadImage={uploadImage}
          onChange={handleChange}
        />
      ) : (
        <BlockTextPreview
          content={content}
          field={field}
          text={text}
          className={textClassName}
          placeholder={placeholder}
          onRecordClick={(x, y) => setPendingEditorClick(blockId, x, y)}
          onActivate={activateEditor}
        />
      )}
    </div>
  );
}
