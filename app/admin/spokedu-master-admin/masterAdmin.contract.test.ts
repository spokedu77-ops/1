import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('MASTER ADMIN contract', () => {
  it('adds LAB ADMIN directly after the SPOKEDU LAB entry', () => {
    const source = read('app/components/Sidebar.tsx');
    expect(source).toContain("{ name: 'SPOKEDU LAB', href: '/spokedu-lab/dashboard'");
    expect(source).toContain("{ name: 'LAB ADMIN', href: '/admin/spokedu-lab-admin'");
    expect(source.indexOf("name: 'LAB ADMIN'")).toBeGreaterThan(source.indexOf("name: 'SPOKEDU LAB'"));
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
  it('shows and searches the full Auth email only behind the admin-protected member API', () => {
    const dashboard = read('app/api/admin/spokedu-master-admin/route.ts');
    const client = read('app/admin/spokedu-master-admin/MasterAdminClient.tsx');
    expect(dashboard.indexOf('await requireAdmin()')).toBeLessThan(dashboard.indexOf('const [profiles,'));
    expect(dashboard).toContain('readAllMasterAdminPages<UserIdentity>');
    expect(dashboard).toContain('service.auth.admin.listUsers({ page, perPage: pageSize })');
    expect(dashboard).toContain('email: user.email ?? appUser?.email ?? null');
    expect(dashboard).toContain("(user.email ?? '').toLowerCase().includes(query)");
    expect(dashboard).not.toContain('maskedEmail:');
    expect(client).toContain("{m.email ?? '-'}");
    expect(client).not.toContain('maskedEmail');
  });
  it('keeps account role separate from subscription entitlement', () => {
    const dashboard = read('app/api/admin/spokedu-master-admin/route.ts');
    const grants = read('app/api/admin/spokedu-master/entitlement-grants/route.ts');
    const client = read('app/admin/spokedu-master-admin/MasterAdminClient.tsx');
    expect(dashboard).toContain('isPlatformAdminIdentity');
    expect(dashboard).toContain("profile?.account_type === 'institution'");
    expect(dashboard).toContain('accountRole,');
    expect(client).toContain("admin: '관리자', teacher: '강사', institution: '기관', user: '일반 회원'");
    expect(client).toContain("member.accountRole !== 'admin'");
    expect(grants).toContain('isPlatformAdminIdentity');
    expect(grants).toContain('관리자 계정은 일반 이용권 지급 대상이 아닙니다.');
  });
  it('uses a responsive member-to-grant workflow without changing the grant mutation', () => {
    const client = read('app/admin/spokedu-master-admin/MasterAdminClient.tsx');
    expect(client).toContain('lg:grid-cols-[minmax(280px,2fr)_minmax(0,3fr)]');
    expect(client).toContain('max-h-[32rem] overflow-y-auto');
    expect(client).toContain('왼쪽에서 이용권을 지급할 회원을 선택해 주세요.');
    expect(client).toContain('aria-pressed={selected?.id===m.id}');
    expect(client).not.toContain('grid max-h-44 gap-2 overflow-y-auto sm:grid-cols-2');
    expect(client).toContain("body: JSON.stringify({ userId: selected.id, plan, durationDays: duration, reason, campaignId: campaign, preview: true })");
  });
  it('defaults seminar grants and invites to Lite and confirms the exact member and period', () => {
    const client = read('app/admin/spokedu-master-admin/MasterAdminClient.tsx');
    expect(client).toContain("useState<'lite' | 'premium'>('lite')");
    expect(client).toContain("plan: 'lite', durationDays: 30");
    for (const label of ['대상 회원', '이메일', '지급 요금제', '시작일', '종료일']) expect(client).toContain(label);
    expect(client).toContain('기존 자동결제는 변경되거나 취소되지 않습니다.');
    expect(client).toContain('활성 프로모션이 있습니다.');
  });
  it('supports exact email search and pagination beyond the first 20 members', () => {
    const dashboard = read('app/api/admin/spokedu-master-admin/route.ts');
    const client = read('app/admin/spokedu-master-admin/MasterAdminClient.tsx');
    expect(dashboard).toContain("(user.email ?? '').toLowerCase().includes(query)");
    expect(dashboard).toContain('const PAGE_SIZE = 20');
    expect(dashboard).toContain('paginateMasterAdminRows(filtered, page, PAGE_SIZE)');
    expect(dashboard).toContain('members: paged.rows');
    expect(client).toContain('&page=${page}');
    expect(client).toContain('setMembersTotal(data.total)');
    expect(client).toContain('MemberPagination');
  });
  it('keeps promotional mutations isolated from billing and Toss', () => {
    const sources = [read('app/api/admin/spokedu-master/entitlement-grants/route.ts'), read('app/api/admin/spokedu-master/entitlement-grants/[grantId]/route.ts')].join('\n');
    expect(sources).not.toContain("from('spokedu_master_subscriptions').update");
    expect(sources).not.toContain('spokedu_master_payment_orders');
    expect(sources).not.toContain('billingKey');
    expect(sources).not.toContain('tosspayments');
  });
  it('extends only the existing active grant with optimistic locking and an audit trail', () => {
    const grantRoute = read('app/api/admin/spokedu-master/entitlement-grants/[grantId]/route.ts');
    const client = read('app/admin/spokedu-master-admin/MasterAdminClient.tsx');
    expect(grantRoute).toContain("body?.action === 'extend'");
    expect(grantRoute).toContain(".eq('ends_at', existing.ends_at)");
    expect(grantRoute).toContain('extension_history: [...history, extension]');
    expect(grantRoute).toContain("select('id,user_id,plan,source,campaign_id,starts_at,ends_at,activated_at,granted_by,created_at,revoked_at,metadata')");
    expect(grantRoute).not.toContain("from('spokedu_master_subscriptions').update");
    expect(client).toContain('기간 연장');
    expect(client).toContain("action: 'extend'");
    expect(client).toContain('await loadGrants()');
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
  it('loads billing members independently from member-management scope and search state', () => {
    const dashboard = read('app/api/admin/spokedu-master-admin/route.ts');
    const client = read('app/admin/spokedu-master-admin/MasterAdminClient.tsx');
    expect(dashboard).toContain("if (view === 'billing')");
    expect(dashboard).toContain("row.accountClass === 'production'");
    expect(dashboard).toContain('!isSpokeduStaffEmail(row.email)');
    expect(dashboard).toContain('Boolean(row.subscription || row.latestOrder)');
    expect(client).toContain("readJson('/api/admin/spokedu-master-admin?view=billing')");
    expect(client).toContain('setBillingMembers(data.members)');
    expect(client).toContain('{billingMembers.map(m=>');
    expect(client).not.toContain('members.filter(m=>m.subscription||m.latestOrder)');
  });
  it('keeps Auth search separate from the production MASTER population', () => {
    const dashboard = read('app/api/admin/spokedu-master-admin/route.ts');
    const client = read('app/admin/spokedu-master-admin/MasterAdminClient.tsx');
    const memberList = read('app/admin/spokedu-master-admin/MemberListPanel.tsx');
    expect(dashboard).toContain("accountClass === 'production'");
    expect(dashboard).toContain("accountClass !== 'spokedu_only'");
    expect(dashboard).not.toContain("scope === 'all'");
    expect(dashboard).toContain("from('spokedu_master_profiles')");
    expect(dashboard).toContain('users.filter((user) => profiles.has(user.id))');
    expect(dashboard).toContain('hasMasterProfile: true');
    expect(dashboard).toContain("scope') ?? 'production'");
    expect(client).toContain("useState<MemberScope>('production')");
    expect(memberList).toContain("['qa_test'");
    expect(memberList).not.toContain("['all','all accounts']");
    expect(client).not.toContain('전체 SPOKEDU 계정');
    expect(memberList).toContain("['production'");
    expect(dashboard).not.toContain('const summary = { total: rows.length');
  });
  it('excludes spokedu.com staff from 가입 회원 while preserving the 운영진 scope', () => {
    const dashboard = read('app/api/admin/spokedu-master-admin/route.ts');
    expect(dashboard).toContain("endsWith('@spokedu.com')");
    expect(dashboard).toContain("scope !== 'production' || !isSpokeduStaffEmail(user.email)");
    expect(dashboard).toContain("scope === 'internal'");
  });
  it('does not expose the unused inactive member-management tab or summary fields', () => {
    const dashboard = read('app/api/admin/spokedu-master-admin/route.ts');
    const client = read('app/admin/spokedu-master-admin/MasterAdminClient.tsx');
    expect(client).not.toContain("['inactive','비활성']");
    expect(client).not.toContain("| 'inactive';");
    expect(dashboard).not.toContain("scope === 'inactive'");
    expect(dashboard).not.toContain('inactive: rows.filter');
  });
  it('shows an operator-friendly SPOKEDU LAB usage summary without changing funnel semantics', () => {
    const dashboard = read('app/api/admin/spokedu-master-admin/route.ts');
    const client = read('app/admin/spokedu-master-admin/MasterAdminClient.tsx');
    const tracker = read('app/spokedu-master/components/analytics/MasterFunnelTracker.tsx');
    expect(dashboard).toContain('funnelEvidence(production)');
    expect(dashboard).toContain("eq('route', 'master')");
    expect(client).toContain('FunnelSummary');
    expect(client).toContain('SPOKEDU LAB 이용 현황');
    expect(client).toContain('테스트 계정과 내부 계정은 제외됩니다.');
    expect(client).toContain("['upgradeIntent', '결제 관심 사용자']");
    expect(tracker).toContain("canonicalPathname === '/spokedu-lab/payment'");
    expect(tracker).toContain("trackMasterFunnelEvent('upgrade_intent'");
    expect(client).toContain('과거 값을 추정하지 않습니다');
  });
});
