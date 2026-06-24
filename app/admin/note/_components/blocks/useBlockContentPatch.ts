'use client';

import { useCallback } from 'react';
import { getMergedBlockContentBase } from '../../_lib/noteBlockContentResolve';
import { normalizeTodoBlockContentRecord } from '../../_lib/noteTodoContent';
import type { NoteBlock } from '../../_lib/types';

/**
 * 블록 content 부분 패치 — 스토어 기준 병합 후 단일 onContentPatch로 전달.
 * 호출 측은 applyBlockContentChange(syncBlockContent / handleUpdateBlock)만 연결한다.
 */
export function useBlockContentPatch(
  block: NoteBlock,
  onContentPatch: (content: Record<string, unknown>) => void,
) {
  return useCallback((partial: Record<string, unknown>) => {
    const base = getMergedBlockContentBase(block);
    let next = { ...base, ...partial };
    if (block.type === 'todo') {
      next = normalizeTodoBlockContentRecord(next);
    }
    onContentPatch(next);
  }, [block.id, block.type, block.content, onContentPatch]);
}
