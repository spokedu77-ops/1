import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('MASTER ADMIN contract', () => {
  it('adds the navigation directly after existing SPOKEDU MASTER', () => {
    const source = read('app/components/Sidebar.tsx');
    expect(source).toContain("{ name: 'SPOKEDU MASTER', href: '/spokedu-master/dashboard'");
    expect(source).toContain("{ name: 'MASTER ADMIN', href: '/admin/spokedu-master-admin'");
    expect(source.indexOf("name: 'MASTER ADMIN'")).toBeGreaterThan(source.indexOf("name: 'SPOKEDU MASTER'"));
  });
  it('protects the page and every management API with server admin authorization', () => {
    expect(read('app/admin/spokedu-master-admin/page.tsx')).toContain('requireAdmin');
    for (const path of [
      'app/api/admin/spokedu-master-admin/route.ts',
      'app/api/admin/spokedu-master/entitlement-grants/route.ts',
      'app/api/admin/spokedu-master/entitlement-grants/[grantId]/route.ts',
      'app/api/admin/spokedu-master/promotion-invites/route.ts',
    ]) expect(read(path)).toContain('requireAdmin');
  });
  it('keeps promotional mutations isolated from billing and Toss', () => {
    const sources = [read('app/api/admin/spokedu-master/entitlement-grants/route.ts'), read('app/api/admin/spokedu-master/entitlement-grants/[grantId]/route.ts')].join('\n');
    expect(sources).not.toContain("from('spokedu_master_subscriptions').update");
    expect(sources).not.toContain('spokedu_master_payment_orders');
    expect(sources).not.toContain('billingKey');
    expect(sources).not.toContain('tosspayments');
  });
  it('never exposes token hashes or payment secrets from admin read APIs', () => {
    const dashboard = read('app/api/admin/spokedu-master-admin/route.ts');
    const invites = read('app/api/admin/spokedu-master/promotion-invites/route.ts');
    expect(dashboard).not.toContain('provider_billing_key_secret_id');
    expect(invites).not.toContain("select('token_hash");
    expect(dashboard).not.toContain('paymentKey: payment.payment_key');
  });
  it('returns read-only payment incident evidence without hiding non-active orders', () => {
    const dashboard = read('app/api/admin/spokedu-master-admin/route.ts');
    const client = read('app/admin/spokedu-master-admin/MasterAdminClient.tsx');
    expect(dashboard).toContain('last_error_code');
    expect(dashboard).toContain('paymentApproved: Boolean(payment.payment_key)');
    expect(dashboard).not.toContain(".eq('status', 'active')");
    expect(dashboard).toContain('deriveMasterAdminBillingIncident');
    expect(client).toContain('결제 승인 / 이용권 반영 실패');
    expect(client).toContain('조회 전용');
  });
  it('keeps Auth search separate from the production MASTER population', () => {
    const dashboard = read('app/api/admin/spokedu-master-admin/route.ts');
    expect(dashboard).toContain("accountClass === 'production'");
    expect(dashboard).toContain("accountClass !== 'spokedu_only'");
    expect(dashboard).toContain("scope === 'all'");
    expect(dashboard).not.toContain('const summary = { total: rows.length');
  });
});
