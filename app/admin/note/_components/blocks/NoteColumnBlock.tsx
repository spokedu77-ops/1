'use client';

import type { ReactNode } from 'react';
import { EMPTY_BLOCK_PLACEHOLDER } from '../../_lib/noteBlockRowUi';
import type { NoteBlock } from '../../_lib/types';

type NoteColumnBlockProps = {
  block: NoteBlock;
  childBlocks: NoteBlock[];
  renderChildBlock?: (child: NoteBlock, nestDepth?: number) => ReactNode;
  onAddChildBelow?: (type?: NoteBlock['type'], content?: Record<string, unknown>) => void;
};

export function NoteColumnBlock({
  block,
  childBlocks,
  renderChildBlock,
  onAddChildBelow,
}: NoteColumnBlockProps) {
  const showEmptySlot = childBlocks.length === 0 && !!onAddChildBelow;

  return (
    <div
      className="min-w-0 flex-1 rounded-md border border-slate-200/80 bg-white px-2 py-1.5"
      data-note-column
      data-block-id={block.id}
    >
      {childBlocks.length > 0 ? (
        <div className="note-block-children space-y-0 overflow-visible">
          {childBlocks.map((child) => (
            <div key={child.id}>{renderChildBlock?.(child, 2)}</div>
          ))}
        </div>
      ) : showEmptySlot ? (
        <div
          className="min-h-[30px] cursor-text py-0.5"
          onMouseDown={(e) => {
            e.preventDefault();
            onAddChildBelow?.('text');
          }}
        >
          <span className="text-[16px] leading-[1.7] text-neutral-400">
            {EMPTY_BLOCK_PLACEHOLDER}
          </span>
        </div>
      ) : (
        <div className="min-h-[30px]" aria-hidden />
      )}
    </div>
  );
}
