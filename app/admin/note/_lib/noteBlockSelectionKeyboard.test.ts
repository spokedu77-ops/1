import { describe, expect, it } from 'vitest';
import {
  resolveBlockIdsForSelectionDelete,
  shouldDeleteSelectedNoteBlocks,
} from './noteBlockSelectionKeyboard';

describe('shouldDeleteSelectedNoteBlocks', () => {
  it('handles Delete and Backspace as block-selection deletion keys', () => {
    expect(shouldDeleteSelectedNoteBlocks({ key: 'Delete' })).toBe(true);
    expect(shouldDeleteSelectedNoteBlocks({ key: 'Backspace' })).toBe(true);
  });

  it('ignores modified and composing key events', () => {
    expect(shouldDeleteSelectedNoteBlocks({ key: 'Delete', ctrlKey: true })).toBe(false);
    expect(shouldDeleteSelectedNoteBlocks({ key: 'Backspace', metaKey: true })).toBe(false);
    expect(shouldDeleteSelectedNoteBlocks({ key: 'Delete', altKey: true })).toBe(false);
    expect(shouldDeleteSelectedNoteBlocks({ key: 'Backspace', isComposing: true })).toBe(false);
  });
});

describe('resolveBlockIdsForSelectionDelete', () => {
  it('prefers marquee/handle selected block ids', () => {
    expect(resolveBlockIdsForSelectionDelete({
      selectedBlockIds: ['a', 'b'],
      crossBlockIds: ['x', 'y', 'z'],
    })).toEqual(['a', 'b']);
  });

  it('falls back to multi-block cross-select ids only', () => {
    expect(resolveBlockIdsForSelectionDelete({
      selectedBlockIds: [],
      crossBlockIds: ['a', 'b'],
    })).toEqual(['a', 'b']);
    expect(resolveBlockIdsForSelectionDelete({
      selectedBlockIds: [],
      crossBlockIds: ['only'],
    })).toEqual([]);
  });
});
