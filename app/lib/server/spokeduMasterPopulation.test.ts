import { describe, expect, it } from 'vitest';
import { classifyMasterAccount, hasRenewalProblem, isMasterQaAccount } from './spokeduMasterPopulation';

describe('SPOKEDU MASTER population', () => {
  it('does not turn an Auth-only account into a MASTER member', () => {
    expect(classifyMasterAccount({
      hasMasterProfile: false,
      identity: {},
      profile: null,
      appUser: null,
      subscription: null,
    })).toBe('spokedu_only');
  });

  it('does not count an administratively granted identity without a MASTER profile', () => {
    expect(classifyMasterAccount({
      hasMasterProfile: false,
      identity: {},
      profile: null,
      appUser: { role: 'teacher' },
      subscription: { status: 'active' },
    })).toBe('spokedu_only');
  });

  it('uses explicit server fixture metadata without reading the email address', () => {
    expect(isMasterQaAccount({
      identity: { appMetadata: { spokedu_master_account_type: 'qa' } },
      profile: null,
      subscription: null,
    })).toBe(true);
  });

  it('recognizes legacy deterministic fixture fingerprints', () => {
    expect(isMasterQaAccount({
      identity: {},
      profile: { created_at: '2026-09-25T13:09:03.332Z' },
      subscription: { pg_provider: 'tosspayments', created_at: '2026-09-25T13:09:03.431Z' },
    })).toBe(true);
    expect(isMasterQaAccount({
      identity: {},
      profile: null,
      subscription: { pg_provider: 'manual_qa' },
    })).toBe(true);
  });

  it('keeps internal and inactive accounts outside production', () => {
    expect(classifyMasterAccount({ hasMasterProfile: true, identity: {}, profile: null, appUser: { is_admin: true }, subscription: null })).toBe('internal');
    expect(classifyMasterAccount({ hasMasterProfile: true, identity: {}, profile: null, appUser: { is_active: false }, subscription: null })).toBe('inactive');
  });

  it('requires an actual renewal-problem signal', () => {
    expect(hasRenewalProblem({ last_billing_error: 'declined', renewal_retry_count: 0 })).toBe(false);
    expect(hasRenewalProblem({ last_billing_error: 'declined', renewal_retry_count: 1 })).toBe(true);
  });
});
