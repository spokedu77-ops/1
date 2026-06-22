'use client';

import { Check } from 'lucide-react';
import { EMPTY_BLOCK_PLACEHOLDER } from '../../_lib/noteBlockRowUi';
import { createInlineBlockEnterHandler } from '../../_lib/noteInlineBlockEnter';
import { NoteBlockFormattedField } from './NoteBlockFormattedField';
import type { NoteBlock } from '../../_lib/types';
import type { NoteBlockFormattedFieldProps } from './NoteBlockFormattedField';

type NoteTodoBlockProps = {
  block: NoteBlock;
  contentMarginLeft: number;
  inlineRowPadding: string;
  rootBlockShell: string;
  enterCreatesBlockBelow: boolean;
  onUpdate: (content: Record<string, unknown>) => void;
  onEnter: () => void;
  onAddBelow: (type?: NoteBlock['type'], content?: Record<string, unknown>) => void;
  onSlashChange?: NoteBlockFormattedFieldProps['onSlashChange'];
  slashHostRef?: React.RefObject<HTMLDivElement | null>;
} & Pick<
  NoteBlockFormattedFieldProps,
  | 'autoFocusSignal'
  | 'mergeFocusCaretOffset'
  | 'onContentSync'
  | 'onChangeType'
  | 'onShowFormatToolbar'
  | 'onHideFormatToolbar'
  | 'onIndentChange'
  | 'onNavigatePrevious'
  | 'onNavigateNext'
  | 'onTrackActiveBlock'
  | 'onFocusBlock'
  | 'onEmptyBackspace'
  | 'onMergeWithPrevious'
  | 'canMergeWithPrevious'
  | 'uploadImage'
  | 'onOpenDocument'
  | 'onMultilinePaste'
>;

export function NoteTodoBlock({
  block,
  contentMarginLeft,
  inlineRowPadding,
  rootBlockShell,
  enterCreatesBlockBelow,
  onUpdate,
  onEnter,
  onAddBelow,
  onSlashChange,
  slashHostRef,
  ...fieldProps
}: NoteTodoBlockProps) {
  const checked = !!block.content?.checked;
  const text = typeof block.content?.text === 'string' ? block.content.text : '';

  const handleTodoEnter = createInlineBlockEnterHandler({
    block,
    followType: 'todo',
    text,
    onAddBelow,
    onChangeType: fieldProps.onChangeType,
    onIndentChange: fieldProps.onIndentChange,
  });

  return (
    <div
      className={`flex items-start gap-2 ${inlineRowPadding || rootBlockShell}`}
      style={{ marginLeft: `${contentMarginLeft}px` }}
    >
      <button
        type="button"
        className={`mt-[3px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border transition-colors ${
          checked ? 'border-blue-500 bg-blue-500 text-white' : 'border-neutral-300 bg-white hover:border-blue-400'
        }`}
        onClick={() => onUpdate({ ...block.content, checked: !checked })}
      >
        {checked && <Check className="h-3 w-3" />}
      </button>
      <div className="relative min-w-0 flex-1">
        <NoteBlockFormattedField
          block={block}
          text={text}
          placeholder={EMPTY_BLOCK_PLACEHOLDER}
          textClassName={`text-[16px] leading-7 ${checked ? 'text-slate-400 line-through' : 'text-slate-800'}`}
          enterCreatesBlock={enterCreatesBlockBelow}
          enterSplitOnMidBlock={enterCreatesBlockBelow}
          onEditorEnter={enterCreatesBlockBelow ? handleTodoEnter : onEnter}
          onUpdate={onUpdate}
          onSlashChange={onSlashChange}
          slashHostRef={slashHostRef}
          {...fieldProps}
        />
      </div>
    </div>
  );
}
