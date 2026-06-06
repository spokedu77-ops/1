'use client';

import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { BLOCK_TYPES } from '../_lib/constants';
import type { NoteBlock } from '../_lib/types';
import { BlockPickerMenu } from './SlashMenu';

export function BlockInsertGap({
  onInsert,
}: {
  onInsert: (type: NoteBlock['type']) => void;
}) {
  const [pickerAnchor, setPickerAnchor] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="group/insert relative h-1.5 transition-[height] hover:h-6">
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-neutral-200/80 opacity-0 transition-opacity group-hover/insert:opacity-100" />
      <div className="absolute -left-[54px] top-1/2 z-10 flex -translate-y-1/2 items-center opacity-0 transition-opacity group-hover/insert:opacity-100">
        <button
          ref={btnRef}
          type="button"
          className="pointer-events-auto flex h-5 w-5 items-center justify-center rounded text-neutral-300 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
          aria-label="블록 삽입"
          title="블록 추가"
          onClick={(e) => {
            e.stopPropagation();
            if (pickerAnchor) {
              setPickerAnchor(null);
              return;
            }
            const rect = btnRef.current!.getBoundingClientRect();
            setPickerAnchor({ top: rect.bottom + 4, left: rect.left });
          }}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      {pickerAnchor && (
        <div className="fixed z-[10000]" style={{ top: pickerAnchor.top, left: pickerAnchor.left }}>
          <BlockPickerMenu
            commands={BLOCK_TYPES}
            onSelect={(type) => {
              onInsert(type);
              setPickerAnchor(null);
            }}
            onClose={() => setPickerAnchor(null)}
          />
        </div>
      )}
    </div>
  );
}
