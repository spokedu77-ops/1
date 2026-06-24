import { describe, expect, it } from 'vitest';
import {
  DEFAULT_NOTE_BLOCK_VERSION,
  ensureNoteBlockVersion,
  normalizeNoteBlockVersion,
  withExpectedVersion,
} from './noteBlockVersion';
import type { NoteBlock } from './types';

describe('noteBlockVersion', () => {
  it('normalizes missing version to default', () => {
    expect(normalizeNoteBlockVersion(undefined)).toBe(DEFAULT_NOTE_BLOCK_VERSION);
    expect(normalizeNoteBlockVersion(0)).toBe(DEFAULT_NOTE_BLOCK_VERSION);
    expect(normalizeNoteBlockVersion(3.8)).toBe(3);
  });

  it('ensures version on blocks', () => {
    const block = { id: 'a' } as NoteBlock;
    expect(ensureNoteBlockVersion(block).version).toBe(DEFAULT_NOTE_BLOCK_VERSION);
  });

  it('adds expected_version from block state', () => {
    const patch = withExpectedVersion({ id: 'a', content: { text: 'x' } }, {
      id: 'a',
      version: 7,
    } as NoteBlock);
    expect(patch.expected_version).toBe(7);
  });
});
