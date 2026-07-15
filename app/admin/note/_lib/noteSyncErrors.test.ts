import { describe, expect, it } from 'vitest';
import { isNoteSyncRecoverableError, toNoteSyncUserMessage } from './noteSyncErrors';

describe('noteSyncErrors', () => {
  it('treats duplicate seq as recoverable', () => {
    expect(isNoteSyncRecoverableError(
      'duplicate key value violates unique constraint "note_block_ops_document_seq_unique"',
    )).toBe(true);
  });

  it('does not surface recoverable errors to users', () => {
    expect(toNoteSyncUserMessage(new Error(
      'duplicate key value violates unique constraint "note_block_ops_document_seq_unique"',
    ))).toBeNull();
  });

  it('does not surface stale block patches to users', () => {
    expect(toNoteSyncUserMessage(new Error('block not found: abc'))).toBeNull();
  });

  it('treats Failed to fetch as recoverable / not user-facing', () => {
    expect(isNoteSyncRecoverableError('Failed to fetch')).toBe(true);
    expect(toNoteSyncUserMessage(new TypeError('Failed to fetch'))).toBeNull();
  });

  it('surfaces non-sync errors', () => {
    expect(toNoteSyncUserMessage(new Error('permission denied'))).toBe('permission denied');
  });
});
