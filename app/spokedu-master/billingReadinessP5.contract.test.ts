import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * P5 — D readiness without Toss/DB secrets.
 * Locks recurring billing schema that restore integrity must verify,
 * reconcile --apply policy, and that risk-audit no longer claims legacy confirm-only path.
 */
function read(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

const BILLING_SUBSCRIPTION_COLUMNS = [
  'next_billing_at',
  'cancel_at_period_end',
  'provider_billing_key_secret_id',
] as const;

const BILLING_ORDER_COLUMNS = [
  'billing_cycle_key',
] as const;

describe('SPOKEDU MASTER billing readiness (P5)', () => {
  it('requires recurring billing columns in data-integrity required_columns', () => {
    const integrity = read('scripts/spokedu-master-data-integrity.mjs');
    for (const column of BILLING_SUBSCRIPTION_COLUMNS) {
      expect(integrity).toContain(`('spokedu_master_subscriptions', '${column}')`);
    }
    for (const column of BILLING_ORDER_COLUMNS) {
      expect(integrity).toContain(`('spokedu_master_payment_orders', '${column}')`);
    }
  });

  it('keeps payment-reconcile apply mode intentionally blocked with exit 2', () => {
    const reconcile = read('scripts/spokedu-master-payment-reconcile.mjs');
    expect(reconcile).toContain("args.has('--apply')");
    expect(reconcile).toContain('Apply mode is intentionally not implemented');
    expect(reconcile).toContain('process.exitCode = 2');
    expect(reconcile).toContain('allowedRecoveryActions');
    expect(reconcile).toContain('reapply_only');
    expect(reconcile).toContain('manual_ops_review');
  });

  it('documents billing/issue + cancel path instead of legacy confirm-only access grant', () => {
    const audit = read('docs/spokedu-master-commercial-risk-audit.md');
    expect(audit).toContain('2026-07-28 amendment');
    expect(audit).toContain('/api/spokedu-master/payment/billing/issue');
    expect(audit).toContain('/api/spokedu-master/payment/billing/cancel');
    expect(audit).toContain('strictCommercialScore');
    expect(audit).toContain('≠ D 8+');
    expect(audit).toContain('mock only으로 D 8+ 선언 금지');
  });

  it('keeps issue/renew source order: claim → charge → apply (no billingKey in JSON)', () => {
    const issue = read('app/api/spokedu-master/payment/billing/issue/route.ts');
    const renew = read('app/api/spokedu-master/payment/billing/renew/route.ts');
    expect(issue).toContain('shouldReapplySpokeduMasterBillingOrder');
    expect(renew).toContain('shouldReapplySpokeduMasterBillingOrder');
    expect(issue).toContain('findSpokeduMasterPaymentByOrderId');
    expect(renew).toContain('findSpokeduMasterPaymentByOrderId');
    const responseTail = issue.slice(issue.lastIndexOf('return NextResponse.json'));
    expect(responseTail).not.toContain('billingKey');
  });
});
