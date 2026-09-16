import { describe, expect, it } from 'vitest';
import { calculateSpokeduMasterLiteUpgradeQuote, SPOKEDU_MASTER_LITE_PREMIUM_MONTHLY_DIFFERENCE } from './spokeduMasterProration';

describe('SPOKEDU MASTER Lite upgrade proration', () => {
  it('charges only the remaining share of the 19,000원 difference', () => {
    const quote = calculateSpokeduMasterLiteUpgradeQuote({
      periodStart: '2026-09-01T00:00:00.000Z', periodEnd: '2026-10-01T00:00:00.000Z', now: new Date('2026-09-16T00:00:00.000Z'),
    });
    expect(SPOKEDU_MASTER_LITE_PREMIUM_MONTHLY_DIFFERENCE).toBe(19000);
    expect(quote?.amountDueNow).toBe(9500);
    expect(quote?.nextBillingAt).toBe('2026-10-01T00:00:00.000Z');
    expect(quote?.nextBillingAmount).toBe(28900);
  });
});