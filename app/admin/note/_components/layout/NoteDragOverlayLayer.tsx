'use client';

import { DragOverlay } from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';
import { DragPreview } from '../blocks/NoteBlockRows';
import { DocIconGlyph, resolveDocIcon } from '../../_lib/noteDocumentUi';
import { useNotePage } from '../../_page/NotePageContext';

export function NoteDragOverlayLayer() {
  const { activeBlock, multiDragCount, activeDragDocument } = useNotePage();

  return (
    <DragOverlay dropAnimation={{ duration: 160, easing: 'ease' }}>
      {activeBlock ? (
        multiDragCount > 1 ? (
          <div className="flex items-center gap-2 rounded-md border border-blue-300 bg-blue-50 px-3 py-2 shadow-lg">
            <GripVertical className="h-4 w-4 text-blue-500" />
            <span className="text-[14px] font-medium text-blue-800">
              {multiDragCount}
              개 블록
            </span>
          </div>
        ) : (
          <DragPreview block={activeBlock} />
        )
      ) : activeDragDocument ? (
        <div className="flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 shadow-lg">
          <DocIconGlyph icon={resolveDocIcon(activeDragDocument.properties)} />
          <span className="max-w-[200px] truncate text-[14px] font-medium text-neutral-800">
            {activeDragDocument.title}
          </span>
        </div>
      ) : null}
    </DragOverlay>
  );
}
