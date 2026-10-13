import { describe, expect, it } from 'vitest';
import { diagnoseSpokeduMasterBillingRecovery, type BillingRecoveryOrder, type BillingRecoverySubscription } from './spokeduMasterBillingRecovery';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const NOW = Date.parse('2026-10-10T00:30:00.000Z');
const order = (patch: Partial<BillingRecoveryOrder> = {}): BillingRecoveryOrder => ({ order_id: `spm-premium-initial-${USER_ID}`, user_id: USER_ID, plan: 'premium', amount: 28900, status: 'active', billing_cycle_key: `initial:${USER_ID}:premium`, created_at: '2026-10-10T00:00:00.000Z', updated_at: '2026-10-10T00:01:00.000Z', applied_at: '2026-10-10T00:02:00.000Z', last_processed_at: '2026-10-10T00:02:00.000Z', last_error_code: null, paymentApproved: true, ...patch });
const subscription = (patch: Partial<BillingRecoverySubscription> = {}): BillingRecoverySubscription => ({ id: 'sub-1', user_id: USER_ID, plan: 'premium', status: 'active', pg_provider: 'tosspayments', toss_order_id: `spm-premium-initial-${USER_ID}`, current_period_end: '2026-11-10T00:00:00.000Z', ...patch });
const diagnose = (orderPatch: Partial<BillingRecoveryOrder> = {}, subscriptionPatch: Partial<BillingRecoverySubscription> | null = {}) => diagnoseSpokeduMasterBillingRecovery({ order: order(orderPatch), subscription: subscriptionPatch === null ? null : subscription(subscriptionPatch), webhooks: [], now: NOW });

describe('billing recovery diagnosis', () => {
  it('distinguishes applied, duplicate-safe, and approved-but-not-applied orders', () => {
    expect(diagnose().status).toBe('applied');
    expect(diagnose({ applied_at: null, status: 'recoverable_failed', last_error_code: 'apply_failed' }).status).toBe('recovery_candidate');
  });

  it('blocks missing approval evidence and flags owner, plan, and amount mismatches', () => {
    expect(diagnose({ paymentApproved: false, applied_at: null, status: 'failed' }, null).status).toBe('not_recoverable');
    expect(diagnose({}, { user_id: '22222222-2222-4222-8222-222222222222' }).status).toBe('manual_review');
    expect(diagnose({}, { plan: 'lite' }).status).toBe('manual_review');
    expect(diagnose({ amount: 1234 }).status).toBe('manual_review');
  });

  it('requires manual review for partial/full cancellation and manual QA', () => {
    expect(diagnose({ last_error_code: 'partial_cancel_review_required' }).status).toBe('manual_review');
    expect(diagnose({ status: 'cancelled' }).status).toBe('manual_review');
    expect(diagnose({}, { pg_provider: 'manual_qa' }).status).toBe('manual_review');
  });

  it('separates the 10-minute warning from the 15-minute reclaim lease', () => {
    const atNine = diagnoseSpokeduMasterBillingRecovery({ order: order({ status: 'processing', paymentApproved: false, applied_at: null, updated_at: '2026-10-10T00:00:00.000Z', last_processed_at: null }), subscription: null, webhooks: [], now: Date.parse('2026-10-10T00:09:59.999Z') });
    const atTen = diagnoseSpokeduMasterBillingRecovery({ order: order({ status: 'processing', paymentApproved: false, applied_at: null, updated_at: '2026-10-10T00:00:00.000Z', last_processed_at: null }), subscription: null, webhooks: [], now: Date.parse('2026-10-10T00:10:00.000Z') });
    const atFifteen = diagnoseSpokeduMasterBillingRecovery({ order: order({ status: 'processing', paymentApproved: false, applied_at: null, updated_at: '2026-10-10T00:00:00.000Z', last_processed_at: null }), subscription: null, webhooks: [], now: Date.parse('2026-10-10T00:15:00.000Z') });
    expect(atNine.processing.phase).toBe('within_warning');
    expect(atTen.processing.phase).toBe('warning');
    expect(atFifteen.processing.phase).toBe('reclaimable');
  });

  it('identifies renewal orders independently from initial orders', () => {
    const renewal = diagnose({ order_id: 'spm-premium-renewal-sub-1-20261010', billing_cycle_key: 'sub-1:20261010' }, { toss_order_id: 'spm-premium-renewal-sub-1-20261010' });
    expect(renewal.orderKind).toBe('renewal');
  });
});
