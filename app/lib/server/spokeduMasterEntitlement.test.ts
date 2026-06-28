import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ensureSpokeduMasterEntitlement,
  evaluateSpokeduMasterEntitlement,
  isSpokeduMasterPaidPlanActive,
  isSpokeduMasterPaidPlanExpired,
  isSpokeduMasterTrialActive,
  type SpokeduMasterSubscriptionRow,
} from './spokeduMasterAccess';

const NOW = Date.parse('2026-06-25T00:00:00.000Z');

function row(
  overrides: Partial<SpokeduMasterSubscriptionRow> = {},
): SpokeduMasterSubscriptionRow {
  return {
    plan: 'free',
    status: 'trial',
    period_end: null,
    trial_started_at: '2026-06-25T00:00:00.000Z',
    trial_ends_at: '2026-07-09T00:00:00.000Z',
    ...overrides,
  };
}

function entitlementDb(initial: SpokeduMasterSubscriptionRow | null) {
  let stored = initial;
  let inserts = 0;
  const from = vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(async () => ({ data: stored, error: null })),
      })),
    })),
    insert: vi.fn(async (payload: Record<string, unknown>) => {
      inserts += 1;
      if (stored) return { error: { code: '23505' } };
      stored = row({
        plan: String(payload.plan),
        status: String(payload.status),
        trial_started_at: String(payload.trial_started_at),
        trial_ends_at: String(payload.trial_ends_at),
      });
      return { error: null };
    }),
  }));
  return {
    service: { from } as never,
    getStored: () => stored,
    getInsertCount: () => inserts,
  };
}

describe('SPOKEDU MASTER entitlement', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  it('creates a 14-day server trial on first MASTER access', async () => {
    const db = entitlementDb(null);
    const result = await ensureSpokeduMasterEntitlement(db.service, 'user-a');
    expect(result.error).toBeNull();
    expect(result.row).toMatchObject({
      plan: 'free',
      status: 'trial',
      trial_started_at: '2026-06-25T00:00:00.000Z',
      trial_ends_at: '2026-07-09T00:00:00.000Z',
    });
  });

  it('resolves concurrent first access to one stored entitlement row', async () => {
    const db = entitlementDb(null);
    const [first, second] = await Promise.all([
      ensureSpokeduMasterEntitlement(db.service, 'user-a'),
      ensureSpokeduMasterEntitlement(db.service, 'user-a'),
    ]);
    expect(first.row).toEqual(second.row);
    expect(db.getStored()).not.toBeNull();
  });

  it('does not extend an existing trial on reconnect', async () => {
    const existing = row({ trial_started_at: '2026-06-20T00:00:00.000Z' });
    const db = entitlementDb(existing);
    await ensureSpokeduMasterEntitlement(db.service, 'user-a');
    expect(db.getStored()).toBe(existing);
    expect(db.getInsertCount()).toBe(0);
  });

  it('does not overwrite paid or expired rows with a trial', async () => {
    for (const existing of [
      row({ plan: 'pro', status: 'active', period_end: '2026-07-25T00:00:00.000Z' }),
      row({ plan: 'team', status: 'expired', period_end: '2026-06-01T00:00:00.000Z' }),
    ]) {
      const db = entitlementDb(existing);
      await ensureSpokeduMasterEntitlement(db.service, 'user-a');
      expect(db.getStored()).toBe(existing);
      expect(db.getInsertCount()).toBe(0);
    }
  });

  it('allows only a valid unexpired trial date', () => {
    expect(isSpokeduMasterTrialActive(row(), NOW)).toBe(true);
    expect(isSpokeduMasterTrialActive(row({ trial_ends_at: null }), NOW)).toBe(false);
    expect(isSpokeduMasterTrialActive(row({ trial_ends_at: 'invalid' }), NOW)).toBe(false);
    expect(isSpokeduMasterTrialActive(row({ trial_ends_at: '2026-06-24T00:00:00.000Z' }), NOW))
      .toBe(false);
  });

  it('fails closed for paid access without a valid future period_end', () => {
    expect(isSpokeduMasterPaidPlanActive(row({
      plan: 'pro',
      status: 'active',
      period_end: null,
    }))).toBe(false);
    expect(isSpokeduMasterPaidPlanActive(row({
      plan: 'pro',
      status: 'active',
      period_end: 'invalid',
    }))).toBe(false);
    expect(isSpokeduMasterPaidPlanExpired(row({
      plan: 'pro',
      status: 'active',
      period_end: null,
    }))).toBe(true);
    expect(isSpokeduMasterPaidPlanActive(row({
      plan: 'team',
      status: 'active',
      period_end: '2026-07-25T00:00:00.000Z',
    }))).toBe(true);
  });

  it.each([
    ['trial active', row(), { allowed: true, plan: 'trial', status: 'trial' }],
    ['trial expired', row({ trial_ends_at: '2026-06-24T00:00:00.000Z' }), { allowed: false, plan: 'free', status: 'expired' }],
    ['pro active', row({ plan: 'pro', status: 'active', period_end: '2026-07-25T00:00:00.000Z' }), { allowed: true, plan: 'pro', status: 'active' }],
    ['team active', row({ plan: 'team', status: 'active', period_end: '2026-07-25T00:00:00.000Z' }), { allowed: true, plan: 'team', status: 'active' }],
    ['period_end missing', row({ plan: 'pro', status: 'active', period_end: null }), { allowed: false, plan: 'pro', status: 'expired' }],
    ['period_end invalid', row({ plan: 'team', status: 'active', period_end: 'not-a-date' }), { allowed: false, plan: 'team', status: 'expired' }],
    ['paid expired', row({ plan: 'pro', status: 'active', period_end: '2026-06-24T00:00:00.000Z' }), { allowed: false, plan: 'pro', status: 'expired' }],
    ['cancelled', row({ plan: 'team', status: 'cancelled', period_end: '2026-07-25T00:00:00.000Z' }), { allowed: false, plan: 'team', status: 'cancelled' }],
    ['none', null, { allowed: false, plan: 'free', status: 'expired' }],
  ])('evaluates %s from the canonical entitlement function', (_label, input, expected) => {
    expect(evaluateSpokeduMasterEntitlement(input, NOW)).toEqual(expected);
  });

  it('returns database lookup errors instead of creating free access', async () => {
    const service = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({
              data: null,
              error: { message: 'db unavailable' },
            })),
          })),
        })),
      })),
    };
    const result = await ensureSpokeduMasterEntitlement(service as never, 'user-a');
    expect(result.row).toBeNull();
    expect(result.error).toEqual({ message: 'db unavailable' });
  });
});
