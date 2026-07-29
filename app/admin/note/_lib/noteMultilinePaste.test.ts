import { describe, expect, it } from 'vitest';
import {
  insertTypeForMultilinePasteFollowUp,
  normalizeMultilinePasteSpecsForAnchor,
} from './noteMultilinePaste';

describe('normalizeMultilinePasteSpecsForAnchor', () => {
  it('rewrites every HTML text row to callout when pasting into a callout', () => {
    const specs = [
      { type: 'text' as const, text: 'first' },
      { type: 'text' as const, text: 'second' },
      { type: 'text' as const, text: 'third' },
    ];
    expect(normalizeMultilinePasteSpecsForAnchor('callout', specs)).toEqual([
      { type: 'callout', text: 'first' },
      { type: 'callout', text: 'second' },
      { type: 'callout', text: 'third' },
    ]);
  });

  it('keeps heading follow-ups as text', () => {
    expect(insertTypeForMultilinePasteFollowUp('heading')).toBe('text');
    expect(normalizeMultilinePasteSpecsForAnchor('heading', [
      { type: 'text', text: 'Title' },
      { type: 'text', text: 'Body' },
    ])).toEqual([
      { type: 'heading', text: 'Title' },
      { type: 'text', text: 'Body' },
    ]);
  });

  it('does not rewrite already typed non-text rows', () => {
    const specs = [
      { type: 'callout' as const, text: 'A' },
      { type: 'text' as const, text: 'B' },
    ];
    expect(normalizeMultilinePasteSpecsForAnchor('callout', specs)).toEqual(specs);
  });
});
