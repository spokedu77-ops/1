import { describe, expect, it } from 'vitest';
import { reviewRefundRequest, validateRefundApproval } from './spokeduMasterRefundReview';

const order = (overrides = {}) => ({ order_id: 'order-1', user_id: 'user-1', amount: 28900, status: 'active', applied_at: '2026-10-10T00:00:00.000Z', paymentApproved: true, ...overrides });
const provider = (overrides = {}) => ({ state: 'verified' as const, refundedAmount: 0, cancellation: 'none' as const, ...overrides });
const review = (overrides: Record<string, unknown> = {}) => reviewRefundRequest({ order: order(), subscription: { user_id: 'user-1', pg_provider: 'toss' }, userId: 'user-1', requestedAmount: 28900, refundType: 'full', idempotencyKey: 'refund-request-key-0001', existingRequests: [], provider: provider(), ...overrides });

describe('refund request review', () => {
  it('accepts verified full and partial requests for internal review', () => {
    expect(review().status).toBe('eligible');
    expect(review({ requestedAmount: 10000, refundType: 'partial' }).refundableAmount).toBe(28900);
  });
  it('rejects unapproved, fully cancelled, over-amount and wrong-owner orders', () => {
    expect(review({ order: order({ paymentApproved: false }) }).status).toBe('ineligible');
    expect(review({ order: order({ status: 'cancelled' }), provider: provider({ cancellation: 'full' }) }).status).toBe('ineligible');
    expect(review({ requestedAmount: 30000, refundType: 'partial' }).status).toBe('ineligible');
    expect(review({ userId: 'user-2' }).status).toBe('ineligible');
  });
  it('rejects manual QA and duplicate open requests', () => {
    expect(review({ subscription: { user_id: 'user-1', pg_provider: 'manual_qa' } }).status).toBe('ineligible');
    expect(review({ existingRequests: [{ id: 'r1', order_id: 'order-1', requested_amount: 28900, idempotency_key: 'refund-request-key-0001', status: 'received' }] }).status).toBe('ineligible');
  });
  it('subtracts verified prior refunds and open requests', () => {
    const result = review({ requestedAmount: 9000, refundType: 'partial', provider: provider({ refundedAmount: 10000, cancellation: 'partial' }), existingRequests: [{ id: 'r1', order_id: 'order-1', requested_amount: 9000, idempotency_key: 'different-key-0001', status: 'under_review' }] });
    expect(result.refundableAmount).toBe(9900);
    expect(result.status).toBe('ineligible');
  });
  it('holds when PG evidence cannot confirm the refundable balance', () => {
    const result = review({ provider: provider({ state: 'unverified', refundedAmount: null, cancellation: 'unknown' }) });
    expect(result.status).toBe('hold');
    expect(result.refundableAmount).toBeNull();
  });
  it('does not report success when DB or PG lookup fails', () => {
    expect(review({ order: null }).status).toBe('ineligible');
    expect(review({ provider: provider({ state: 'lookup_error', refundedAmount: null, cancellation: 'unknown' }) }).status).toBe('lookup_error');
  });
  it('keeps payment approval and entitlement application separate', () => {
    const result = review({ order: order({ applied_at: null }) });
    expect(result.status).toBe('eligible');
    expect(result.entitlementApplied).toBe(false);
    expect(result.warnings.join(' ')).toContain('이용권 반영');
  });
});

describe('refund approval separation', () => {
  it('blocks self approval, unauthorized approvers and duplicate approval', () => {
    expect(validateRefundApproval({ requestStatus: 'under_review', requesterId: 'admin-1', approverId: 'admin-1', approverAuthorized: true, orderRevalidated: true }).allowed).toBe(false);
    expect(validateRefundApproval({ requestStatus: 'under_review', requesterId: 'admin-1', approverId: 'admin-2', approverAuthorized: false, orderRevalidated: true }).allowed).toBe(false);
    expect(validateRefundApproval({ requestStatus: 'approved', requesterId: 'admin-1', approverId: 'admin-2', approverAuthorized: true, orderRevalidated: true }).allowed).toBe(false);
  });
  it('requires order revalidation immediately before approval', () => {
    expect(validateRefundApproval({ requestStatus: 'under_review', requesterId: 'admin-1', approverId: 'admin-2', approverAuthorized: true, orderRevalidated: false }).allowed).toBe(false);
    expect(validateRefundApproval({ requestStatus: 'under_review', requesterId: 'admin-1', approverId: 'admin-2', approverAuthorized: true, orderRevalidated: true }).allowed).toBe(true);
  });
});
