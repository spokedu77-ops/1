'use client';

import type { ReactNode } from 'react';
import { createInlineBlockEnterHandler } from '../../_lib/noteInlineBlockEnter';
import { NoteBlockFormattedField } from './NoteBlockFormattedField';
import { useBlockContentPatch } from './useBlockContentPatch';
import type { NoteInlineTextBlockProps } from './noteBlockContentTypes';

export function NoteCalloutBlock({
  block,
  liveContent,
  contentMarginLeft,
  isInsideToggle,
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
  const icon = typeof liveContent.icon === 'string' && liveContent.icon.trim()
    ? liveContent.icon
    : '💡';

  const patchCallout = useBlockContentPatch(block, onContentPatch);

  const handleCalloutEnter = createInlineBlockEnterHandler({
    block,
    followType: 'callout',
    text,
    parentBlockType: isInsideToggle ? 'toggle' : null,
    onAddBelow,
    onChangeType,
    onIndentChange,
  });

  return (
    <div
      className="relative rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2"
      style={{ marginLeft: `${contentMarginLeft}px` }}
    >
      <div className="mb-1 flex items-center gap-2">
        <input
          value={icon}
          onChange={(e) => patchCallout({ icon: e.target.value.slice(0, 2) })}
          className="w-10 rounded border border-amber-200 bg-white px-1 text-center text-sm"
        />
        <span className="flex-1 text-xs font-semibold text-amber-700">콜아웃</span>
      </div>
      {renderFormatToolbar()}
      <NoteBlockFormattedField
        block={block}
        text={text}
        placeholder="강조 메시지를 입력하세요 (/ 로 블록 변환)"
        textClassName="text-[15px] leading-7 text-slate-800"
        enterCreatesBlock={enterCreatesBlockBelow}
        enterSplitOnMidBlock={enterCreatesBlockBelow}
        onEditorEnter={enterCreatesBlockBelow ? handleCalloutEnter : onEnter}
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
