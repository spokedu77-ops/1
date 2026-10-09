import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MemberDetailPanel } from './MemberDetailPanel';

const baseDetail = {
  member: { id: 'member-1', email: 'member@example.com', name: '회원', created_at: '2026-10-01T00:00:00.000Z', account_type: 'personal', onboarding_done: true },
  access: { effectivePlan: 'premium', effectiveSource: 'billing', promoStartsAt: null, promoEndsAt: null, fallbackPlan: 'free' },
  grants: [],
  subscription: { status: 'active' },
  orders: [],
  billingIncident: { label: '확인 필요', tone: 'warning' },
};

describe('MemberDetailPanel payment evidence', () => {
  it('distinguishes approved-but-not-applied from applied payment', () => {
    const pending = renderToStaticMarkup(<MemberDetailPanel detail={{
      ...baseDetail,
      latestOrder: { order_id: 'order-1', plan: 'premium', amount: 28900, status: 'active', updated_at: '2026-10-10T01:02:03.000Z', applied_at: null, last_error_code: 'entitlement_apply_failed', paymentApproved: true },
    }} loading={false} error="" onClose={() => undefined}/>);
    expect(pending).toContain('승인 확인 · 반영 미확인');

    const applied = renderToStaticMarkup(<MemberDetailPanel detail={{
      ...baseDetail,
      latestOrder: { order_id: 'order-1', plan: 'premium', amount: 28900, status: 'active', updated_at: '2026-10-10T01:02:03.000Z', applied_at: '2026-10-10T01:03:00.000Z', last_error_code: null, paymentApproved: true },
    }} loading={false} error="" onClose={() => undefined}/>);
    expect(applied).toContain('승인 및 반영 확인');
  });

  it('renders an empty recent-order state', () => {
    const markup = renderToStaticMarkup(<MemberDetailPanel detail={{ ...baseDetail, latestOrder: null }} loading={false} error="" onClose={() => undefined}/>);
    expect(markup).toContain('최근 주문');
    expect(markup).toContain('없음');
  });
});
