import { describe, expect, it } from 'vitest';
import { buildBillingIncidents } from './spokeduMasterBillingIncidents';
import type { BillingOrder, BillingSubscription } from './spokeduMasterBillingAdmin';

const order = (patch: Partial<BillingOrder>): BillingOrder => ({ order_id: 'order-1', user_id: 'user-1', plan: 'premium', amount: 28900, status: 'active', created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:01:00Z', applied_at: '2026-10-01T00:01:00Z', last_processed_at: '2026-10-01T00:01:00Z', last_error_code: null, paymentApproved: true, ...patch });
const subscription = (patch: Partial<BillingSubscription> = {}): BillingSubscription => ({ id: 'sub-1', user_id: 'user-1', plan: 'premium', status: 'active', pg_provider: 'tosspayments', toss_order_id: 'order-1', current_period_end: '2026-11-01T00:00:00Z', next_billing_at: '2026-11-01T00:00:00Z', cancel_at_period_end: false, renewal_retry_count: 0, last_billing_error: null, next_retry_at: null, ...patch });

describe('billing incident read model', () => {
  it('keeps customer incidents separate from grouped scheduler failures', () => {
    const incidents = buildBillingIncidents({
      orders: [order({ status: 'recoverable_failed', applied_at: null })], subscriptions: [subscription()], webhooks: [],
      runs: [
        { id: 'run-1', started_at: '2026-10-01T00:00:00Z', completed_at: null, status: 'failed', attempted: 0, succeeded: 0, failed: 0, skipped: 0, error_code: 'billing_provider_not_configured' },
        { id: 'run-2', started_at: '2026-10-02T00:00:00Z', completed_at: null, status: 'failed', attempted: 0, succeeded: 0, failed: 0, skipped: 0, error_code: 'billing_provider_not_configured' },
      ],
    });
    expect(incidents.filter((incident) => incident.scope === 'customer')).toHaveLength(1);
    const scheduler = incidents.find((incident) => incident.scope === 'system');
    expect(scheduler?.occurrenceCount).toBe(2);
    expect(scheduler?.firstOccurredAt).toBe('2026-10-01T00:00:00Z');
    expect(scheduler?.lastOccurredAt).toBe('2026-10-02T00:00:00Z');
  });

  it('deduplicates an order issue by deterministic order and issue identity', () => {
    const incidents = buildBillingIncidents({ orders: [order({ status: 'processing', paymentApproved: false, applied_at: null, last_processed_at: '2026-01-01T00:00:00Z' })], subscriptions: [], webhooks: [], runs: [], now: Date.parse('2026-01-01T01:00:00Z') });
    expect(incidents.map((incident) => incident.id)).toEqual(['order:order-1:processing_stale']);
  });

  it('exposes webhook failures without inventing a customer when no order exists', () => {
    const incidents = buildBillingIncidents({ orders: [], subscriptions: [], webhooks: [{ event_key: 'event-1', event_type: 'PAYMENT_STATUS_CHANGED', order_id: 'missing', status: 'failed', created_at: '2026-10-01T00:00:00Z' }], runs: [] });
    expect(incidents[0]).toMatchObject({ type: 'webhook_error', userId: null, orderId: 'missing' });
  });
});
