import type { NoteBlock } from './types';

function blocksForDocument(blocks: NoteBlock[], documentId: string): NoteBlock[] {
  return blocks
    .filter((block) => block.document_id === documentId)
    .sort((a, b) => a.order_index - b.order_index || a.id.localeCompare(b.id));
}

function blockStructureKey(block: NoteBlock): string {
  return [
    block.id,
    block.type,
    block.parent_block_id ?? '',
    block.order_index,
  ].join('|');
}

function blockContentFingerprint(block: NoteBlock): string {
  try {
    return JSON.stringify(block.content ?? null);
  } catch {
    return String(block.content);
  }
}

/** revalidate 시 structural dispatch 생략 — 동일 스냅샷이면 UI 깜빡임 방지 */
export function documentSnapshotsEquivalent(
  current: NoteBlock[],
  incoming: NoteBlock[],
  documentId: string,
): boolean {
  const left = blocksForDocument(current, documentId);
  const right = blocksForDocument(incoming, documentId);
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) {
    if (blockStructureKey(left[i]) !== blockStructureKey(right[i])) return false;
    if (blockContentFingerprint(left[i]) !== blockContentFingerprint(right[i])) return false;
  }
  return true;
}
