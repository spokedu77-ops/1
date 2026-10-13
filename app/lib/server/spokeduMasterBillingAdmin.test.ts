import { describe, expect, it } from 'vitest';
import { classifyBillingIssue, isActualPaidOrder, isActualPaidSubscription, paginateBillingRows, type BillingOrder, type BillingSubscription } from './spokeduMasterBillingAdmin';

const order = (patch: Partial<BillingOrder> = {}): BillingOrder => ({ order_id: 'order-1', user_id: 'user-1', plan: 'premium', amount: 28900, status: 'active', created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z', applied_at: '2026-10-01T00:01:00Z', last_processed_at: '2026-10-01T00:01:00Z', last_error_code: null, paymentApproved: true, ...patch });
const subscription = (patch: Partial<BillingSubscription> = {}): BillingSubscription => ({ id: 'sub-1', user_id: 'user-1', plan: 'premium', status: 'active', pg_provider: 'tosspayments', toss_order_id: 'order-1', current_period_end: '2026-11-01T00:00:00Z', next_billing_at: '2026-11-01T00:00:00Z', cancel_at_period_end: false, renewal_retry_count: 0, last_billing_error: null, next_retry_at: null, ...patch });

describe('SPOKEDU MASTER billing admin read model', () => {
  it('requires approval and entitlement application for actual revenue', () => {
    expect(isActualPaidOrder(order())).toBe(true);
    expect(isActualPaidOrder(order({ applied_at: null }))).toBe(false);
    expect(isActualPaidOrder(order({ paymentApproved: false }))).toBe(false);
  });

  it('never counts manual QA subscriptions as paid', () => {
    expect(isActualPaidSubscription(subscription({ pg_provider: 'manual_qa' }), order())).toBe(false);
    expect(isActualPaidSubscription(subscription(), order())).toBe(true);
  });

  it('separates approved application failures, stale processing and partial cancellation', () => {
    expect(classifyBillingIssue(order({ status: 'recoverable_failed', applied_at: null }), subscription()).code).toBe('approved_apply_failed');
    expect(classifyBillingIssue(order({ status: 'processing', paymentApproved: false, applied_at: null, last_processed_at: '2026-01-01T00:00:00Z' }), subscription(), Date.parse('2026-01-01T01:00:00Z')).code).toBe('processing_stale');
    expect(classifyBillingIssue(order({ last_error_code: 'partial_cancel_review_required' }), subscription()).code).toBe('partial_cancel_review_required');
  });

  it('paginates more than twenty records without loss or duplication', () => {
    const rows = Array.from({ length: 41 }, (_, index) => `row-${index}`);
    const pages = [1, 2, 3].flatMap((page) => paginateBillingRows(rows, page).rows);
    expect(pages).toEqual(rows);
    expect(new Set(pages).size).toBe(41);
    expect(paginateBillingRows(rows, 3).total).toBe(41);
  });
});
