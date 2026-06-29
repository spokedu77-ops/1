'use client';

import { Fragment, type ReactNode } from 'react';
import { stripListItemMarkerPrefix, bulletMarkerForLevel } from '../noteBulletInput';
import { createNoteListBlockHandlers } from '../../_lib/noteListBlockHandlers';
import { NoteBlockFormattedField } from './NoteBlockFormattedField';
import type { NoteInlineTextBlockProps } from './noteBlockContentTypes';
import type { NoteBlock } from '../../_lib/types';

type NoteListBlockProps = NoteInlineTextBlockProps & {
  listType: 'bulletList' | 'numberedList';
  listNestLevel: number;
  numberedListIndex?: number;
  childBlocks?: NoteBlock[];
  renderChildBlock?: (child: NoteBlock, nestDepth?: number) => ReactNode;
  toggleNestDepth?: number;
  omitExternalizedChildren?: boolean;
  onChangeType: (type: NoteBlock['type']) => void;
  onRequestCaretOffset?: (offset: number) => void;
  canMergeWithPrevious?: () => boolean;
  onMergeWithPrevious?: () => void;
};

export function NoteListBlock({
  block,
  liveContent,
  listType,
  listNestLevel,
  numberedListIndex,
  contentMarginLeft,
  inlineRowPadding,
  rootBlockShell,
  isInsideToggle,
  enterCreatesBlockBelow,
  childBlocks = [],
  renderChildBlock,
  toggleNestDepth = 1,
  omitExternalizedChildren = false,
  onContentPatch,
  onEnter,
  onAddBelow,
  onChangeType,
  onIndentChange,
  onRequestCaretOffset,
  canMergeWithPrevious,
  onMergeWithPrevious,
  onSlashChange,
  slashHostRef,
  ...fieldProps
}: NoteListBlockProps) {
  const rawText = typeof liveContent.text === 'string' ? liveContent.text : '';
  const text = stripListItemMarkerPrefix(rawText);

  const {
    handleListItemBackspaceAtStart,
    handleListItemEmptyBackspace,
    handleListItemEnter,
  } = createNoteListBlockHandlers({
    block,
    onIndentChange,
    onChangeType,
    onRequestCaretOffset,
    onAddBelow,
    canMergeWithPrevious,
    onMergeWithPrevious,
  });

  const listMarker = listType === 'bulletList' ? (
    <span
      className={`mt-[2px] min-w-[1.25rem] shrink-0 text-center text-[16px] leading-7 select-none ${
        listNestLevel === 0 ? 'text-neutral-900' : 'text-slate-600'
      }`}
      aria-hidden
    >
      {bulletMarkerForLevel(listNestLevel).trim()}
    </span>
  ) : (
    <span
      className="mt-[2px] min-w-[1.25rem] shrink-0 text-right text-[16px] leading-7 text-slate-500 select-none"
      aria-hidden
    >
      {(numberedListIndex
        ?? (typeof block.content?.number === 'number' ? block.content.number : 1))}.
    </span>
  );

  const showChildren = !omitExternalizedChildren && childBlocks.length > 0 && renderChildBlock;
  const rowShell = isInsideToggle ? inlineRowPadding : (inlineRowPadding || rootBlockShell);

  return (
    <div style={{ marginLeft: `${contentMarginLeft}px` }}>
      <div className={`flex items-start gap-2 ${rowShell}`}>
        {listMarker}
        <div className="relative min-w-0 flex-1" data-note-list-text>
          <NoteBlockFormattedField
            block={block}
            text={text}
            placeholder={listType === 'bulletList' ? '글머리 목록' : '번호 목록'}
            textClassName="text-[16px] leading-7 text-slate-800"
            enterCreatesBlock={enterCreatesBlockBelow}
            enterSplitOnMidBlock={enterCreatesBlockBelow}
            onEditorBackspace={handleListItemEmptyBackspace}
            onEditorBackspaceAtBlockStart={handleListItemBackspaceAtStart}
            onEditorEnter={enterCreatesBlockBelow
              ? (ctx) => handleListItemEnter(listType, ctx)
              : onEnter}
            onContentPatch={onContentPatch}
            onSlashChange={onSlashChange}
            slashHostRef={slashHostRef}
            onChangeType={onChangeType}
            onIndentChange={onIndentChange}
            {...fieldProps}
          />
        </div>
      </div>
      {showChildren ? (
        <div className="note-block-children space-y-0 overflow-visible">
          {childBlocks.map((child) => (
            <Fragment key={child.id}>
              {renderChildBlock(child, toggleNestDepth + 1)}
            </Fragment>
          ))}
        </div>
      ) : null}
    </div>
  );
}
