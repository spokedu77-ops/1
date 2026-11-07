import { afterEach, describe, expect, it } from 'vitest';
import { commitRunGrant, issueRunGrant, resetRunGrantsForTests, verifyRunGrant } from './feedbackRunGrant';

describe('feedback run grant', () => {
  afterEach(() => {
    resetRunGrantsForTests();
    delete process.env.AUTOMATION_WORKER_SECRET;
  });

  it('accepts a grant once and rejects reuse, expiry, mismatch, and forgery', () => {
    process.env.AUTOMATION_WORKER_SECRET = 'test-secret-value-32chars-minimum';
    const token = issueRunGrant('job-1', 1_000);
    const first = verifyRunGrant(token, 'job-1', 1_000);
    expect(first.ok).toBe(true);
    if (first.ok) commitRunGrant(first.jti);
    expect(verifyRunGrant(token, 'job-1', 1_000)).toEqual({ ok: false, code: 'GRANT_REUSED' });

    const expired = issueRunGrant('job-2', 1_000);
    expect(verifyRunGrant(expired, 'job-2', 1_000 + 120_000)).toEqual({ ok: false, code: 'GRANT_EXPIRED' });

    const other = issueRunGrant('job-3', 1_000);
    expect(verifyRunGrant(other, 'job-9', 1_000)).toEqual({ ok: false, code: 'GRANT_JOB_MISMATCH' });

    expect(verifyRunGrant(`${token}x`, 'job-1', 1_000).ok).toBe(false);
    expect(verifyRunGrant('not-a-token', 'job-1', 1_000)).toEqual({ ok: false, code: 'GRANT_MALFORMED' });
  });
});
