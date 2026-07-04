'use client';

import type { ReactNode } from 'react';
import { NoteColumnBlock } from './NoteColumnBlock';
import type { NoteBlock } from '../../_lib/types';

type NoteColumnListBlockProps = {
  columnBlocks: NoteBlock[];
  lookupChildBlocks: (parentId: string) => NoteBlock[];
  renderChildBlock?: (child: NoteBlock, nestDepth?: number) => ReactNode;
  onAddChildInColumn: (columnId: string, type?: NoteBlock['type'], content?: Record<string, unknown>) => void;
  contentMarginLeft: number;
  rootBlockShell: string;
};

export function NoteColumnListBlock({
  columnBlocks,
  lookupChildBlocks,
  renderChildBlock,
  onAddChildInColumn,
  contentMarginLeft,
  rootBlockShell,
}: NoteColumnListBlockProps) {
  return (
    <div
      className={`overflow-visible ${rootBlockShell}`}
      style={{ marginLeft: `${contentMarginLeft}px` }}
      data-note-column-list
    >
      <div className="flex w-full items-start gap-3">
        {columnBlocks.map((column) => (
          <NoteColumnBlock
            key={column.id}
            block={column}
            childBlocks={lookupChildBlocks(column.id)}
            renderChildBlock={renderChildBlock}
            onAddChildBelow={(type, content) => onAddChildInColumn(column.id, type, content)}
          />
        ))}
      </div>
    </div>
  );
}
