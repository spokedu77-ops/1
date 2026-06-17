import type { NoteBlock } from './types';

export type NoteBlockSearchHit = {
  blockId: string;
  blockType: string;
  snippet: string;
  matchIndex: number;
};

function collectStrings(value: unknown, out: string[]) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed) out.push(trimmed);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, out));
  }
}

export function blockSearchableText(block: NoteBlock): string {
  const parts: string[] = [];
  collectStrings(block.content, parts);
  return parts.join(' ');
}

export function searchNoteBlocks(blocks: NoteBlock[], query: string): NoteBlockSearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const hits: NoteBlockSearchHit[] = [];
  for (const block of blocks) {
    const text = blockSearchableText(block);
    const lower = text.toLowerCase();
    let from = 0;
    while (from < lower.length) {
      const idx = lower.indexOf(q, from);
      if (idx < 0) break;
      const start = Math.max(0, idx - 24);
      const end = Math.min(text.length, idx + q.length + 24);
      const snippet = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
      hits.push({
        blockId: block.id,
        blockType: block.type,
        snippet,
        matchIndex: idx,
      });
      from = idx + q.length;
    }
  }
  return hits;
}
