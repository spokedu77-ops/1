import { describe, expect, it } from 'vitest';
import {
  isMasterAccessShellPending,
  isStaleAccessRequest,
  shouldPreserveSnapshotOnSoftRecheckFailure,
  shouldSkipHardAccessFetch,
} from './masterAccessGateState';

describe('masterAccessGateState', () => {
  it('blocks the shell only before the first verified snapshot', () => {
    expect(isMasterAccessShellPending(true, { status: 'checking', snapshot: null })).toBe(true);
    expect(isMasterAccessShellPending(true, { status: 'allowed', snapshot: { plan: 'lite' } })).toBe(false);
    expect(isMasterAccessShellPending(true, { status: 'redirecting', snapshot: null })).toBe(true);
    expect(isMasterAccessShellPending(false, { status: 'checking', snapshot: null })).toBe(false);
  });

  it('skips hard access fetch when a verified snapshot is already present', () => {
    expect(shouldSkipHardAccessFetch({ status: 'allowed', snapshot: { plan: 'lite' } })).toBe(true);
    expect(shouldSkipHardAccessFetch({ status: 'checking', snapshot: null })).toBe(false);
    expect(shouldSkipHardAccessFetch({ status: 'error', snapshot: null })).toBe(false);
  });

  it('detects stale access responses', () => {
    expect(isStaleAccessRequest(1, 2)).toBe(true);
    expect(isStaleAccessRequest(2, 2)).toBe(false);
  });

  it('preserves snapshot on soft recheck failure only when already allowed', () => {
    expect(shouldPreserveSnapshotOnSoftRecheckFailure({ status: 'allowed', snapshot: { plan: 'lite' } })).toBe(true);
    expect(shouldPreserveSnapshotOnSoftRecheckFailure({ status: 'checking', snapshot: null })).toBe(false);
    expect(shouldPreserveSnapshotOnSoftRecheckFailure({ status: 'error', snapshot: null })).toBe(false);
  });
});
