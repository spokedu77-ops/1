import { describe, expect, it } from 'vitest';
import { resolveListCrossSurface } from './noteListCrossSelect';

describe('resolveListCrossSurface', () => {
  it('uses editor when TipTap is mounted for the block', () => {
    expect(resolveListCrossSurface(true, true)).toBe('editor');
    expect(resolveListCrossSurface(true, false)).toBe('editor');
  });

  it('uses preview for inactive list blocks (singleton)', () => {
    expect(resolveListCrossSurface(false, true)).toBe('preview');
  });

  it('falls back to preview instead of editor when neither surface exists', () => {
    expect(resolveListCrossSurface(false, false)).toBe('preview');
  });
});
