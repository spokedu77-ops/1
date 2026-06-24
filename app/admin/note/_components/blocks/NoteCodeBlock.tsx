'use client';

import type { ReactNode } from 'react';
import { createInlineBlockEnterHandler } from '../../_lib/noteInlineBlockEnter';
import { NoteBlockFormattedField } from './NoteBlockFormattedField';
import type { NoteInlineTextBlockProps } from './noteBlockContentTypes';

export function NoteCodeBlock({
  block,
  contentMarginLeft,
  enterCreatesBlockBelow,
  onContentPatch,
  onEnter,
  onAddBelow,
  onChangeType,
  onIndentChange,
  onSlashChange,
  slashHostRef,
  renderSlashMenuPortal,
  ...fieldProps
}: NoteInlineTextBlockProps & {
  renderSlashMenuPortal: () => ReactNode;
}) {
  const text = typeof block.content?.text === 'string' ? block.content.text : '';

  const handleCodeEnter = createInlineBlockEnterHandler({
    block,
    followType: 'code',
    text,
    onAddBelow,
    onChangeType,
    onIndentChange,
  });

  return (
    <div
      className="relative rounded-xl border border-slate-200 bg-slate-950 px-4 py-3 shadow-sm"
      style={{ marginLeft: `${contentMarginLeft}px` }}
    >
      <div className="mb-2 flex items-center">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Code</span>
      </div>
      <NoteBlockFormattedField
        block={block}
        text={text}
        placeholder="코드를 입력하세요 (/ 로 블록 변환)"
        textClassName="font-mono text-[13px] leading-6 text-slate-100"
        tabBehavior="block-indent"
        enterCreatesBlock={enterCreatesBlockBelow}
        enterSplitOnMidBlock={enterCreatesBlockBelow}
        onEditorEnter={enterCreatesBlockBelow ? handleCodeEnter : onEnter}
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
