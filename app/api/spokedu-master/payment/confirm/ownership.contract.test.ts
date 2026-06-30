import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(process.cwd(), 'app/api/spokedu-master/payment/confirm/route.ts'),
  'utf8',
);

describe('SPOKEDU MASTER legacy confirm boundary', () => {
  it('keeps the one-time confirm route closed for recurring billing', () => {
    expect(source).toContain('status: 410');
    expect(source).toContain('월 자동결제 등록 API');
    expect(source).not.toContain('applySpokeduMasterPayment');
    expect(source).not.toContain("spokedu_master_payment_orders");
    expect(source).not.toContain('payments/confirm');
  });
});
