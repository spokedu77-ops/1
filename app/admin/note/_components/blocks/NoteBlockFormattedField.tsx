'use client';

import type { InlineMark } from '@/app/lib/note/inlineMarkup';
import { NoteEditableField } from '../NoteEditableField';
import type { NoteEditorEnterContext } from '../NoteEditor';
import { resolveInlineBackspaceAtStartAction } from '../../_lib/noteNotionBlockBehavior';
import type { PastedBlockSpec } from '../../_lib/notePasteBlocks';
import type { NoteBlock } from '../../_lib/types';

export type NoteBlockFormattedFieldProps = {
  block: NoteBlock;
  text: string;
  placeholder: string;
  textClassName: string;
  field?: 'text';
  tabBehavior?: 'block-indent' | 'insert-text-indent' | 'table-cell-nav';
  enterCreatesBlock?: boolean;
  enterSplitOnMidBlock?: boolean;
  autoFocusSignal?: number;
  mergeFocusCaretOffset?: number;
  onEditorEnter?: (ctx?: NoteEditorEnterContext) => void;
  onEditorBackspace?: (() => void) | false;
  onEditorBackspaceAtBlockStart?: () => boolean;
  onEditorMergeWithPrevious?: () => void;
  onEditorCanMergeWithPrevious?: () => boolean;
  editorMergeFocusCaretOffset?: number;
  onUpdate?: (content: Record<string, unknown>) => void;
  onContentSync?: (content: Record<string, unknown>) => void;
  onContentPatch?: (content: Record<string, unknown>) => void;
  onChangeType?: (type: NoteBlock['type']) => void;
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
  onIndentChange?: (direction: 'in' | 'out') => void;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  onTrackActiveBlock?: (part?: 'title' | 'editor') => void;
  onFocusBlock?: () => void;
  onEmptyBackspace?: () => void;
  onMergeWithPrevious?: () => void;
  canMergeWithPrevious?: () => boolean;
  uploadImage?: (file: File) => Promise<string>;
  onOpenDocument?: (documentId: string) => void;
  onMultilinePaste?: (specs: PastedBlockSpec[]) => void;
  slashHostRef?: React.RefObject<HTMLDivElement | null>;
};

export function NoteBlockFormattedField({
  block,
  text,
  placeholder,
  textClassName,
  field = 'text',
  tabBehavior = 'block-indent',
  enterCreatesBlock = false,
  enterSplitOnMidBlock = false,
  autoFocusSignal = 0,
  mergeFocusCaretOffset,
  onEditorEnter,
  onEditorBackspace,
  onEditorBackspaceAtBlockStart,
  onEditorMergeWithPrevious,
  onEditorCanMergeWithPrevious,
  editorMergeFocusCaretOffset,
  onUpdate,
  onContentSync,
  onContentPatch,
  onChangeType,
  onShowFormatToolbar,
  onHideFormatToolbar,
  onSlashChange,
  onIndentChange,
  onNavigatePrevious,
  onNavigateNext,
  onTrackActiveBlock,
  onFocusBlock,
  onEmptyBackspace,
  onMergeWithPrevious,
  canMergeWithPrevious,
  uploadImage,
  onOpenDocument,
  onMultilinePaste,
  slashHostRef,
}: NoteBlockFormattedFieldProps) {
  const inlineBackspaceAction = resolveInlineBackspaceAtStartAction(block.type);
  const convertInlineBlockToText = inlineBackspaceAction.kind === 'convert-to-text' && onChangeType
    ? () => { onChangeType('text'); }
    : undefined;
  const handleBackspaceAtBlockStart = onEditorBackspaceAtBlockStart
    ?? (convertInlineBlockToText
      ? () => {
        convertInlineBlockToText();
        return true;
      }
      : undefined);
  const handleEmptyBackspace = onEditorBackspace === false
    ? false
    : (onEditorBackspace ?? convertInlineBlockToText ?? onEmptyBackspace);

  return (
    <NoteEditableField
      blockId={block.id}
      blockType={block.type}
      field={field}
      fallbackContent={block.content}
      text={text}
      placeholder={placeholder}
      textClassName={textClassName}
      autoFocusSignal={autoFocusSignal}
      enterCreatesBlock={enterCreatesBlock}
      enterSplitOnMidBlock={enterSplitOnMidBlock}
      tabBehavior={tabBehavior}
      onEditorEnter={onEditorEnter}
      onEditorBackspace={handleEmptyBackspace}
      onEditorBackspaceAtBlockStart={handleBackspaceAtBlockStart}
      onEditorMergeWithPrevious={onEditorMergeWithPrevious ?? onMergeWithPrevious}
      onEditorCanMergeWithPrevious={onEditorCanMergeWithPrevious ?? canMergeWithPrevious}
      editorMergeFocusCaretOffset={editorMergeFocusCaretOffset}
      mergeFocusCaretOffset={mergeFocusCaretOffset}
      onIndentChange={onIndentChange}
      onNavigatePrevious={onNavigatePrevious}
      onNavigateNext={onNavigateNext}
      onTrackActiveBlock={onTrackActiveBlock}
      onFocusBlock={onFocusBlock}
      onContentPatch={onContentPatch}
      onChangeType={onChangeType}
      onShowFormatToolbar={onShowFormatToolbar}
      onHideFormatToolbar={onHideFormatToolbar}
      onSlashChange={onSlashChange}
      uploadImage={uploadImage}
      onOpenDocumentById={onOpenDocument}
      onMultilinePaste={onMultilinePaste}
      slashHostRef={slashHostRef}
    />
  );
}
