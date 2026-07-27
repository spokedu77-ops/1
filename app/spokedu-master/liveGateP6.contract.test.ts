import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * P6 — live gate packaging without claiming D 8+.
 * Locks: student report target smoke, reconcile --apply hard stop,
 * staging payment still requires authKey for --complete-billing,
 * and mock-activation must not be treated as D 8+.
 */
function read(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('SPOKEDU MASTER live gate packaging (P6)', () => {
  it('keeps student report target smoke in commercial suite', () => {
    const smoke = read('scripts/spokedu-master-commercial-smoke-qa.mjs');
    expect(smoke).toContain('runStudentReportTargetSmoke');
    expect(smoke).toContain("['student report target'");
    expect(smoke).toContain("getByRole('button', { name: '학생별 안내문' })");
    expect(smoke).toContain('full-class draft unexpectedly included Alice student memo');
    expect(smoke).toContain('student draft leaked Bob memo');
  });

  it('keeps reconcile --apply blocked with recovery plan only', () => {
    const reconcile = read('scripts/spokedu-master-payment-reconcile.mjs');
    expect(reconcile).toContain("args.has('--apply')");
    expect(reconcile).toContain('Apply mode is intentionally not implemented');
    expect(reconcile).toContain('process.exitCode = 2');
    expect(reconcile).toContain('allowedRecoveryActions');
  });

  it('requires Toss authKey/customerKey for --complete-billing and labels mock as no Toss', () => {
    const payment = read('scripts/spokedu-master-staging-payment-e2e.mjs');
    expect(payment).toContain('--complete-billing');
    expect(payment).toContain('SPOKEDU_MASTER_PAYMENT_E2E_AUTH_KEY');
    expect(payment).toContain('SPOKEDU_MASTER_PAYMENT_E2E_CUSTOMER_KEY');
    expect(payment).toContain('--mock-activation');
    expect(payment).toContain('tossRequired: false');
    expect(payment).toContain('no Toss');
  });

  it('ops-readiness still points at real Toss sandbox payment as next step', () => {
    const ops = read('scripts/spokedu-master-ops-readiness.mjs');
    expect(ops).toContain('User completes Toss sandbox real payment once');
  });
});
