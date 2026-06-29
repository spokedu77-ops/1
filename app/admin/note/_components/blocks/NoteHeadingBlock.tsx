'use client';

import { createHeadingEnterHandler } from '../../_lib/noteInlineBlockEnter';
import { NoteBlockFormattedField } from './NoteBlockFormattedField';
import type { NoteInlineTextBlockProps } from './noteBlockContentTypes';
import type { NoteBlock } from '../../_lib/types';

const HEADING_VARIANTS: Record<
  'heading' | 'heading2' | 'heading3',
  { placeholder: string; textClassName: string; rowClassName: string }
> = {
  heading: {
    placeholder: '제목 1',
    textClassName: 'text-[30px] font-bold leading-tight text-slate-900',
    rowClassName: 'py-2',
  },
  heading2: {
    placeholder: '제목 2',
    textClassName: 'text-[24px] font-bold leading-tight text-slate-900',
    rowClassName: 'py-1',
  },
  heading3: {
    placeholder: '제목 3',
    textClassName: 'text-[20px] font-semibold leading-tight text-slate-900',
    rowClassName: 'py-1',
  },
};

type NoteHeadingBlockProps = NoteInlineTextBlockProps & {
  variant: 'heading' | 'heading2' | 'heading3';
};

export function NoteHeadingBlock({
  block,
  liveContent,
  variant,
  contentMarginLeft,
  rootBlockShell,
  isInsideToggle,
  enterCreatesBlockBelow,
  onContentPatch,
  onEnter,
  onAddBelow,
  onChangeType,
  onIndentChange,
  onSlashChange,
  slashHostRef,
  ...fieldProps
}: NoteHeadingBlockProps) {
  const config = HEADING_VARIANTS[variant];
  const text = typeof liveContent.text === 'string' ? liveContent.text : '';
  const shell = isInsideToggle ? config.rowClassName : rootBlockShell;

  const handleHeadingEnter = createHeadingEnterHandler({
    block,
    text,
    onAddBelow,
    onChangeType,
    onIndentChange,
  });

  return (
    <div
      className={`flex items-start ${shell}`}
      style={{ marginLeft: `${contentMarginLeft}px` }}
    >
      <div className="relative min-w-0 flex-1">
        <NoteBlockFormattedField
          block={block}
          text={text}
          placeholder={config.placeholder}
          textClassName={config.textClassName}
          enterCreatesBlock={enterCreatesBlockBelow}
          enterSplitOnMidBlock={enterCreatesBlockBelow}
          onEditorEnter={enterCreatesBlockBelow ? handleHeadingEnter : onEnter}
          onContentPatch={onContentPatch}
          onChangeType={onChangeType}
          onIndentChange={onIndentChange}
          onSlashChange={onSlashChange}
          slashHostRef={slashHostRef}
          {...fieldProps}
        />
      </div>
    </div>
  );
}

export function isHeadingBlockType(
  type: NoteBlock['type'],
): type is 'heading' | 'heading2' | 'heading3' {
  return type === 'heading' || type === 'heading2' || type === 'heading3';
}
