'use client';

import type { NoteBlock } from '../../_lib/types';
import { useBlockContentPatch } from './useBlockContentPatch';

/** @deprecated 내부적으로 useBlockContentPatch와 동일 — 점진적으로 onContentPatch 직접 사용 */
export function useSyncContentPatch(
  block: NoteBlock,
  onUpdate: (content: Record<string, unknown>) => void,
  onContentSync?: (content: Record<string, unknown>) => void,
) {
  return useBlockContentPatch(block, onContentSync ?? onUpdate);
}
