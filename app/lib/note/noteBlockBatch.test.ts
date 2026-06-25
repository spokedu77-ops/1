import { describe, expect, it } from 'vitest';
import {
  chunkNoteBlockPatches,
  NOTE_BLOCK_PATCH_BATCH_MAX,
} from './noteBlockBatch';

describe('chunkNoteBlockPatches', () => {
  it('uses the API patch limit by default', () => {
    const items = Array.from({ length: 401 }, (_, index) => index);

    expect(chunkNoteBlockPatches(items).map((chunk) => chunk.length)).toEqual([
      NOTE_BLOCK_PATCH_BATCH_MAX,
      NOTE_BLOCK_PATCH_BATCH_MAX,
      1,
    ]);
  });

  it('rejects invalid chunk sizes', () => {
    expect(() => chunkNoteBlockPatches([1], 0)).toThrow(
      'Note block patch batch size must be a positive integer.',
    );
  });
});
