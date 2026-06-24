'use client';

import { useNoteBlockStore } from '../../_store/noteBlockStore';
import type { NoteBlock } from '../../_lib/types';

/** 스토어(편집 중) 우선 content — 토글·memo 행에서 stale prop 방지 */
export function useBlockLiveContent(
  block: Pick<NoteBlock, 'id' | 'content'>,
): Record<string, unknown> {
  const storeContent = useNoteBlockStore((state) => state.byId[block.id]?.content);
  return (storeContent ?? block.content ?? {}) as Record<string, unknown>;
}
