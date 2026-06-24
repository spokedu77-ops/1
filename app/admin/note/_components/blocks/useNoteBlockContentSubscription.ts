'use client';

import { useNoteBlockStore } from '../../_store/noteBlockStore';

/**
 * STORE_ONLY text/html 변경 시 React.memo 행이 리렌더되도록 구독한다.
 * (applyBlockContentChange는 text-only일 때 setBlocks를 생략함)
 */
export function useNoteBlockContentSubscription(blockId: string): void {
  useNoteBlockStore((state) => {
    const content = state.byId[blockId]?.content as Record<string, unknown> | undefined;
    if (!content) return '';
    return [
      content.text,
      content.html,
      content.title,
      content.body,
      content.bodyHtml,
      content.checked,
    ].map((v) => (typeof v === 'string' || typeof v === 'boolean' ? String(v) : '')).join('\0');
  });
}
