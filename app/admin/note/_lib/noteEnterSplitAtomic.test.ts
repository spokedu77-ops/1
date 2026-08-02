import { describe, expect, it, vi } from 'vitest';
import {
  enterSplitCreateFailed,
  runAtomicEnterSplitCreate,
  settleEnterSplitCreate,
} from './noteEnterSplitAtomic';

describe('noteEnterSplitAtomic (C4)', () => {
  it('treats null and false as create failure', () => {
    expect(enterSplitCreateFailed(null)).toBe(true);
    expect(enterSplitCreateFailed(false)).toBe(true);
    expect(enterSplitCreateFailed({ id: 'x' })).toBe(false);
    expect(enterSplitCreateFailed(undefined)).toBe(false);
  });

  it('settleEnterSplitCreate resolves promises and catches throws', async () => {
    expect(await settleEnterSplitCreate(Promise.resolve({ id: 'a' }))).toBe(true);
    expect(await settleEnterSplitCreate(Promise.resolve(null))).toBe(false);
    expect(await settleEnterSplitCreate(Promise.reject(new Error('fail')))).toBe(false);
  });

  it('runAtomicEnterSplitCreate restores full content when below create fails', async () => {
    const restore = vi.fn();
    const ok = await runAtomicEnterSplitCreate({
      createBelow: async () => null,
      restore,
      restoreContent: {
        text: '방시온, 박중현',
        html: '<p>방시온, 박중현</p>',
      },
    });
    expect(ok).toBe(false);
    expect(restore).toHaveBeenCalledWith({
      text: '방시온, 박중현',
      html: '<p>방시온, 박중현</p>',
    });
  });

  it('runAtomicEnterSplitCreate does not restore when create succeeds', async () => {
    const restore = vi.fn();
    const ok = await runAtomicEnterSplitCreate({
      createBelow: async () => ({ id: 'new' } as never),
      restore,
      restoreContent: { text: 'full', html: '<p>full</p>' },
    });
    expect(ok).toBe(true);
    expect(restore).not.toHaveBeenCalled();
  });
});
