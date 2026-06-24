'use client';

import { Check } from 'lucide-react';
import { getMergedBlockContentBase } from '../../_lib/noteBlockContentResolve';
import { resolveTodoChecked } from '../../_lib/noteTodoContent';
import { EMPTY_BLOCK_PLACEHOLDER } from '../../_lib/noteBlockRowUi';
import { createInlineBlockEnterHandler } from '../../_lib/noteInlineBlockEnter';
import { NoteBlockFormattedField } from './NoteBlockFormattedField';
import { useBlockContentPatch } from './useBlockContentPatch';
import type { NoteBlock } from '../../_lib/types';
import type { NoteBlockFormattedFieldProps } from './NoteBlockFormattedField';

type NoteTodoBlockProps = {
  block: NoteBlock;
  contentMarginLeft: number;
  inlineRowPadding: string;
  rootBlockShell: string;
  enterCreatesBlockBelow: boolean;
  /** applyBlockContentChange 단일 진입점 (syncBlockContent) */
  onContentPatch: (content: Record<string, unknown>) => void;
  onEnter: () => void;
  onAddBelow: (type?: NoteBlock['type'], content?: Record<string, unknown>) => void;
  onChangeType: (type: NoteBlock['type']) => void;
  onSlashChange?: NoteBlockFormattedFieldProps['onSlashChange'];
  slashHostRef?: React.RefObject<HTMLDivElement | null>;
} & Pick<
  NoteBlockFormattedFieldProps,
  | 'autoFocusSignal'
  | 'mergeFocusCaretOffset'
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
  onContentPatch,
  onEnter,
  onAddBelow,
  onChangeType,
  onSlashChange,
  slashHostRef,
  ...fieldProps
}: NoteTodoBlockProps) {
  const resolved = getMergedBlockContentBase(block);
  const checked = resolveTodoChecked(resolved);
  const text = typeof resolved.text === 'string' ? resolved.text : '';

  const patchTodo = useBlockContentPatch(block, onContentPatch);

  const handleTodoEnter = createInlineBlockEnterHandler({
    block,
    followType: 'todo',
    text,
    onAddBelow,
    onChangeType,
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
        onClick={() => patchTodo({ checked: !checked })}
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
          onContentPatch={onContentPatch}
          onChangeType={onChangeType}
          onSlashChange={onSlashChange}
          slashHostRef={slashHostRef}
          {...fieldProps}
        />
      </div>
    </div>
  );
}
