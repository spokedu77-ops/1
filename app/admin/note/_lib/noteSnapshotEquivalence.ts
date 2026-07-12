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

/** key 순서에 무관한 canonical JSON — diff gate false negative 방지 */
export function stableContentFingerprint(value: unknown): string {
  if (value === null || value === undefined) {
    return JSON.stringify(value);
  }
  if (typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableContentFingerprint(item)).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableContentFingerprint(record[key])}`).join(',')}}`;
}

function blockContentFingerprint(block: NoteBlock): string {
  try {
    return stableContentFingerprint(block.content ?? null);
  } catch {
    return String(block.content);
  }
}

export type SnapshotDiffReason =
  | 'equivalent'
  | 'length_diff'
  | 'structural_diff'
  | 'content_diff';

/** trace용 — 첫 번째 불일치 이유 (equivalent면 동일 스냅샷) */
export function describeSnapshotDiff(
  current: NoteBlock[],
  incoming: NoteBlock[],
  documentId: string,
): SnapshotDiffReason {
  const left = blocksForDocument(current, documentId);
  const right = blocksForDocument(incoming, documentId);
  if (left.length !== right.length) return 'length_diff';
  for (let i = 0; i < left.length; i += 1) {
    if (blockStructureKey(left[i]) !== blockStructureKey(right[i])) return 'structural_diff';
    if (blockContentFingerprint(left[i]) !== blockContentFingerprint(right[i])) return 'content_diff';
  }
  return 'equivalent';
}

/** revalidate 시 structural dispatch 생략 — 동일 스냅샷이면 UI 깜빡임 방지 */
export function documentSnapshotsEquivalent(
  current: NoteBlock[],
  incoming: NoteBlock[],
  documentId: string,
): boolean {
  return describeSnapshotDiff(current, incoming, documentId) === 'equivalent';
}
