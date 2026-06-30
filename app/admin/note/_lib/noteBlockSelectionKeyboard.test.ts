import { describe, expect, it } from 'vitest';
import { shouldDeleteSelectedNoteBlocks } from './noteBlockSelectionKeyboard';

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
