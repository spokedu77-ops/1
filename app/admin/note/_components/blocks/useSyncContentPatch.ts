'use client';

import { useCallback } from 'react';
import { useNoteBlockStore } from '../../_store/noteBlockStore';
import { STORE_ONLY_CONTENT_KEYS } from '../../_lib/noteContentPatch';
import type { NoteBlock } from '../../_lib/types';

export function useSyncContentPatch(
  block: NoteBlock,
  onUpdate: (content: Record<string, unknown>) => void,
  onContentSync?: (content: Record<string, unknown>) => void,
) {
  return useCallback((partial: Record<string, unknown>) => {
    const base = (useNoteBlockStore.getState().getBlock(block.id)?.content
      ?? block.content
      ?? {}) as Record<string, unknown>;
    const nextContent = { ...base, ...partial };
    const needsReactUpdate = Object.keys(partial).some(
      (key) => !STORE_ONLY_CONTENT_KEYS.has(key),
    );
    if (needsReactUpdate) {
      onUpdate(nextContent);
      return;
    }
    if (onContentSync) onContentSync(nextContent);
    else onUpdate(nextContent);
  }, [block.id, block.content, onContentSync, onUpdate]);
}
