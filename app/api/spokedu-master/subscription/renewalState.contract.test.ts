import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const route = readFileSync(join(process.cwd(), 'app/api/spokedu-master/subscription/route.ts'), 'utf8');
const applyPayment = readFileSync(join(process.cwd(), 'supabase/migrations/20260920190000_spokedu_master_vault_secret_delete.sql'), 'utf8');

describe('subscription renewal state contract', () => {
  it('uses subscription retry state instead of one payment error code', () => {
    expect(route).toContain('hasSpokeduMasterBillingRenewalFailure(row, promotionActive)');
    expect(route).not.toContain("last_error_code', 'renewal_payment_failed'");
  });

  it('clears retry state when payment application succeeds', () => {
    expect(applyPayment).toContain('renewal_retry_count = 0');
    expect(applyPayment).toContain('last_billing_error = NULL');
    expect(applyPayment).toContain('next_retry_at = NULL');
  });
});
