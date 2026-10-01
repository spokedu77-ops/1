import { describe, expect, it } from 'vitest';
import { resolveNextSessionCopyIntent } from './nextSessionCopyIntent';

describe('next Session copy intent', () => {
  it('rejects a request without explicit carryover intent', () => {
    expect(resolveNextSessionCopyIntent({})).toBeNull();
  });

  it('accepts only the canonical no-copy and selective intents', () => {
    expect(resolveNextSessionCopyIntent({ copyPrograms: false })).toEqual({ kind: 'none', copyPrograms: false });
    expect(resolveNextSessionCopyIntent({ sourceSessionProgramIds: ['a', 'b'] })).toEqual({ kind: 'selective', sourceSessionProgramIds: ['a', 'b'] });
    expect(resolveNextSessionCopyIntent({ copyPrograms: true })).toBeNull();
    expect(resolveNextSessionCopyIntent({ copyPrograms: false, sourceSessionProgramIds: [] })).toBeNull();
  });

  it('rejects malformed or duplicate selective ids', () => {
    expect(resolveNextSessionCopyIntent({ sourceSessionProgramIds: ['a', 'a'] })).toBeNull();
    expect(resolveNextSessionCopyIntent({ sourceSessionProgramIds: ['a', 1] })).toBeNull();
  });
});
