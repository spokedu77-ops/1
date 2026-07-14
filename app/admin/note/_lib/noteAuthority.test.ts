import { describe, expect, it } from 'vitest';
import {
  decideEmptySnapshotApply,
  decideRegressiveContentOp,
  readAuthorityBlockText,
  shouldKeepLocalOverEmptyServerAuthority,
} from './noteAuthority';

describe('decideEmptySnapshotApply', () => {
  it('merges when incoming is non-empty', () => {
    expect(decideEmptySnapshotApply({
      localBlocks: [{ id: 'a', type: 'text', content: { text: 'x' } }],
      incomingBlocks: [{ id: 'b' }],
    })).toBe('merge_non_empty');
  });

  it('rejects unconfirmed empty when local has protectable body', () => {
    expect(decideEmptySnapshotApply({
      localBlocks: [{ id: 'a', type: 'text', content: { text: 'keep' } }],
      incomingBlocks: [],
    })).toBe('reject_race_wipe');
  });

  it('rejects unconfirmed empty when local has image presence', () => {
    expect(decideEmptySnapshotApply({
      localBlocks: [{ id: 'a', type: 'image', content: { url: 'https://x/y.png' } }],
      incomingBlocks: [],
    })).toBe('reject_race_wipe');
  });

  it('accepts emptyConfirmed', () => {
    expect(decideEmptySnapshotApply({
      localBlocks: [{ id: 'a', type: 'text', content: { text: 'gone' } }],
      incomingBlocks: [],
      emptyConfirmed: true,
    })).toBe('accept_empty');
  });

  it('accepts when pending leave explains every local id', () => {
    expect(decideEmptySnapshotApply({
      localBlocks: [
        { id: 'a', type: 'text', content: { text: 'x' } },
        { id: 'b', type: 'text', content: { text: 'y' } },
      ],
      incomingBlocks: [],
      pendingLeaveIds: new Set(['a', 'b']),
    })).toBe('accept_empty');
  });

  it('accepts empty stubs without protectable presence', () => {
    expect(decideEmptySnapshotApply({
      localBlocks: [{ id: 'a', type: 'text', content: { text: '', html: '<p></p>' } }],
      incomingBlocks: [],
    })).toBe('accept_empty');
  });
});

describe('decideRegressiveContentOp', () => {
  it('pushes clear intent when local text is already empty', () => {
    expect(decideRegressiveContentOp({ localText: '', patchText: '' })).toBe('push');
  });

  it('drops stale empty patch when local still has text', () => {
    expect(decideRegressiveContentOp({ localText: 'alive', patchText: '' })).toBe('drop_stale');
  });

  it('treats title as protectable body text for regressive checks', () => {
    expect(readAuthorityBlockText({ title: 'Section' })).toBe('Section');
    expect(decideRegressiveContentOp({
      localText: readAuthorityBlockText({ title: 'Section' }),
      patchText: '',
    })).toBe('drop_stale');
  });

  it('pushes non-empty patches', () => {
    expect(decideRegressiveContentOp({ localText: 'a', patchText: 'b' })).toBe('push');
  });

  it('drops stale empty patch when local still has image url', () => {
    expect(decideRegressiveContentOp({
      localText: '',
      patchText: '',
      localHasMediaPresence: true,
      patchHasMediaPresence: false,
    })).toBe('drop_stale');
  });

  it('pushes image clear intent when local media presence already gone', () => {
    expect(decideRegressiveContentOp({
      localText: '',
      patchText: '',
      localHasMediaPresence: false,
      patchHasMediaPresence: false,
    })).toBe('push');
  });
});

describe('shouldKeepLocalOverEmptyServerAuthority', () => {
  it('keeps local body over empty server without leave', () => {
    expect(shouldKeepLocalOverEmptyServerAuthority({
      localBlocks: [{ id: 'a', type: 'text', content: { text: 'typed' } }],
      serverBlocks: [],
    })).toBe(true);
  });

  it('does not keep local when leave covers ids', () => {
    expect(shouldKeepLocalOverEmptyServerAuthority({
      localBlocks: [{ id: 'a', type: 'text', content: { text: 'typed' } }],
      serverBlocks: [],
      pendingLeaveIds: new Set(['a']),
    })).toBe(false);
  });
});
