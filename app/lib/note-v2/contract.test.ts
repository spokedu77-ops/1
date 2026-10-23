import { describe, expect, it } from 'vitest';
import { isNoteV2Id, isSafeVersion, validateNoteV2Content } from './contract';

describe('Note v2 transport contract', () => {
  it('accepts a valid nested block tree', () => {
    const content = [{
      id: 'root', type: 'toggleListItem', content: [],
      children: [{ id: 'child', type: 'paragraph', content: [] }],
    }];
    expect(validateNoteV2Content(content)).toEqual({ ok: true, content });
  });

  it('rejects duplicate IDs, unknown types, and empty snapshots', () => {
    expect(validateNoteV2Content([])).toEqual({ ok: false, error: 'NONEMPTY_BLOCK_ARRAY_REQUIRED' });
    expect(validateNoteV2Content([{ id: 'a', type: 'image' }])).toEqual({ ok: false, error: 'DISALLOWED_BLOCK_TYPE' });
    expect(validateNoteV2Content([
      { id: 'a', type: 'paragraph' },
      { id: 'a', type: 'paragraph' },
    ])).toEqual({ ok: false, error: 'DUPLICATE_BLOCK_ID' });
  });

  it('requires canonical IDs and safe nonnegative versions', () => {
    expect(isNoteV2Id('00000000-0000-4000-8000-000000000001')).toBe(true);
    expect(isNoteV2Id('../documents')).toBe(false);
    expect(isSafeVersion(0)).toBe(true);
    expect(isSafeVersion(-1)).toBe(false);
    expect(isSafeVersion(Number.MAX_SAFE_INTEGER + 1)).toBe(false);
  });
});
