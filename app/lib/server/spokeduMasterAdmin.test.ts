import { describe, expect, it } from 'vitest';
import { buildMasterAdminAccess, grantStatus, maskAdminEmail } from './spokeduMasterAdmin';

const paid = (plan: 'lite' | 'premium') => ({ plan, status: 'active', period_end: '2026-12-01T00:00:00.000Z' });
const promo = (plan: 'lite' | 'premium') => ({ id: 'g1', plan, source: 'event' as const, campaign_id: null, starts_at: '2026-10-01T00:00:00.000Z', ends_at: '2026-11-01T00:00:00.000Z', activated_at: '2026-10-01T00:00:00.000Z' });
const now = Date.parse('2026-10-02T00:00:00.000Z');

describe('MASTER ADMIN access presentation', () => {
  it('keeps paid Lite while Premium promo overlays it', () => {
    expect(buildMasterAdminAccess({ subscription: paid('lite'), grant: promo('premium'), now })).toMatchObject({ paidPlan: 'lite', effectivePlan: 'premium', fallbackPlan: 'lite' });
  });
  it('falls back to Free for a promotion-only member', () => {
    expect(buildMasterAdminAccess({ subscription: null, grant: promo('premium'), now })).toMatchObject({ paidPlan: 'free', effectivePlan: 'premium', fallbackPlan: 'free' });
  });
  it('does not downgrade paid Premium with Lite promo', () => {
    expect(buildMasterAdminAccess({ subscription: paid('premium'), grant: promo('lite'), now })).toMatchObject({ paidPlan: 'premium', effectivePlan: 'premium', fallbackPlan: 'premium' });
  });
  it('classifies grant lifecycle without deleting rows', () => {
    expect(grantStatus({ ...promo('premium'), revoked_at: '2026-10-02T00:00:00.000Z' }, now)).toBe('revoked');
    expect(grantStatus(promo('premium'), now)).toBe('active');
  });
  it('masks list email', () => expect(maskAdminEmail('teacher@example.com')).toBe('tea***@example.com'));
});
