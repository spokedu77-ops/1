export const NOTE_BLOCK_PATCH_BATCH_MAX = 200;

export function chunkNoteBlockPatches<T>(
  items: readonly T[],
  size = NOTE_BLOCK_PATCH_BATCH_MAX,
): T[][] {
  if (!Number.isInteger(size) || size < 1) {
    throw new Error('Note block patch batch size must be a positive integer.');
  }

  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}
