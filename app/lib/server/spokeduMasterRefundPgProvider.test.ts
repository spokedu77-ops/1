import { describe, expect, it } from 'vitest';
import { createMockRefundPgProvider, PG_EXECUTION_DISABLED } from './spokeduMasterRefundPgProvider';

describe('mock refund PG provider', () => {
  it('never executes real PG cancellation', async () => {
    const provider = createMockRefundPgProvider();
    const attempt = await provider.attemptCancellation({ orderId: 'order-1', amount: 10000 });
    expect(attempt.ok).toBe(false);
    expect(attempt.errorCode).toBe(PG_EXECUTION_DISABLED);
  });

  it('can simulate lookup and cancellation failures', async () => {
    const provider = createMockRefundPgProvider({ failOrderIds: new Set(['order-fail']) });
    await expect(provider.lookupEvidence('order-fail')).resolves.toMatchObject({ state: 'lookup_error' });
    const attempt = await provider.attemptCancellation({ orderId: 'order-fail', amount: 1000 });
    expect(attempt.errorCode).toBe('MOCK_PG_FAILURE');
  });
});
