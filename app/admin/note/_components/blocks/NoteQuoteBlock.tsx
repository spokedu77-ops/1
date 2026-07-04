'use client';

import type { ReactNode } from 'react';
import { createInlineBlockEnterHandler } from '../../_lib/noteInlineBlockEnter';
import { NoteBlockFormattedField } from './NoteBlockFormattedField';
import type { NoteInlineTextBlockProps } from './noteBlockContentTypes';

export function NoteQuoteBlock({
  block,
  liveContent,
  contentMarginLeft,
  enterCreatesBlockBelow,
  onContentPatch,
  onEnter,
  onAddBelow,
  onChangeType,
  onIndentChange,
  onSlashChange,
  slashHostRef,
  renderFormatToolbar,
  renderSlashMenuPortal,
  ...fieldProps
}: NoteInlineTextBlockProps & {
  renderFormatToolbar: () => ReactNode;
  renderSlashMenuPortal: () => ReactNode;
}) {
  const text = typeof liveContent.text === 'string' ? liveContent.text : '';

  const handleQuoteEnter = createInlineBlockEnterHandler({
    block,
    followType: 'quote',
    text,
    onAddBelow,
    onChangeType,
    onIndentChange,
  });

  return (
    <div
      className="relative border-l-[3px] border-slate-300 pl-3 py-0.5"
      style={{ marginLeft: `${contentMarginLeft}px` }}
    >
      {renderFormatToolbar()}
      <NoteBlockFormattedField
        block={block}
        text={text}
        placeholder="인용문을 입력하세요 (/ 로 블록 변환)"
        textClassName="text-[15px] leading-7 text-slate-600 italic"
        enterCreatesBlock={enterCreatesBlockBelow}
        enterSplitOnMidBlock={enterCreatesBlockBelow}
        onEditorEnter={enterCreatesBlockBelow ? handleQuoteEnter : onEnter}
        onContentPatch={onContentPatch}
        onChangeType={onChangeType}
        onIndentChange={onIndentChange}
        onSlashChange={onSlashChange}
        slashHostRef={slashHostRef}
        {...fieldProps}
      />
      {renderSlashMenuPortal()}
    </div>
  );
}
