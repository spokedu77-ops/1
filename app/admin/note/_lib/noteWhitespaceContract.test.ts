import { describe, expect, it } from 'vitest';
import { noteWhitespaceClickMayCreateBlocks } from './noteWhitespaceContract';

describe('note whitespace load contract', () => {
  it('forbids creating blocks from editor body whitespace clicks', () => {
    expect(noteWhitespaceClickMayCreateBlocks()).toBe(false);
  });
});
