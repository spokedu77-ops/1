/** Stage 3 transport shape only. No editor customization here. */
export const NOTE_V2_ALLOWED_TYPES = new Set([
  'paragraph', 'heading', 'bulletListItem', 'numberedListItem',
  'checkListItem', 'toggleListItem', 'quote', 'divider',
]);

export type NoteV2Document = {
  id: string;
  title: string;
  content: unknown[];
  content_version: number;
  updated_at: string;
};

export type NoteV2DocumentSummary = Omit<NoteV2Document, 'content'>;
export type ValidationResult = { ok: true; content: unknown[] } | { ok: false; error: string };

export function isNoteV2Id(id: unknown): id is string {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/** Keep the server and DB independent of editor internals, but reject disallowed blocks. */
export function validateNoteV2Content(value: unknown): ValidationResult {
  if (!Array.isArray(value) || value.length < 1) {
    return { ok: false, error: 'NONEMPTY_BLOCK_ARRAY_REQUIRED' };
  }

  let total = 0;
  const seenIds = new Set<string>();
  const validateBlocks = (blocks: unknown[], depth: number): string | null => {
    if (depth > 24) return 'MAX_DEPTH_EXCEEDED';
    for (const item of blocks) {
      total += 1;
      if (total > 2500) return 'MAX_BLOCKS_EXCEEDED';
      if (!item || typeof item !== 'object' || Array.isArray(item)) return 'INVALID_BLOCK';
      const block = item as Record<string, unknown>;
      if (typeof block.type !== 'string' || !NOTE_V2_ALLOWED_TYPES.has(block.type)) return 'DISALLOWED_BLOCK_TYPE';
      if (typeof block.id !== 'string' || block.id.length < 1 || block.id.length > 128) return 'INVALID_BLOCK_ID';
      if (seenIds.has(block.id)) return 'DUPLICATE_BLOCK_ID';
      seenIds.add(block.id);
      if (block.props !== undefined && (!block.props || typeof block.props !== 'object' || Array.isArray(block.props))) return 'INVALID_BLOCK_PROPS';
      if (block.content !== undefined && !Array.isArray(block.content)) return 'INVALID_BLOCK_CONTENT';
      if (block.children !== undefined) {
        if (!Array.isArray(block.children)) return 'INVALID_CHILDREN';
        const error = validateBlocks(block.children, depth + 1);
        if (error) return error;
      }
    }
    return null;
  };
  const error = validateBlocks(value, 0);
  return error ? { ok: false, error } : { ok: true, content: value };
}

export function isSafeVersion(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}
