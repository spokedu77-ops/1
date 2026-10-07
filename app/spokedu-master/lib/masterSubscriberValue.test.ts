import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  MASTER_PRODUCT_CATALOG,
  getMasterPlanValueWorkflowLines,
  getMasterProductPaymentDescription,
  getMasterProductPaymentFeatureLabels,
} from './productCatalog';
import {
  buildMasterGateDisplayModel,
  normalizeMasterGateIntent,
  readMasterGateContextFromSearchParams,
} from './masterGateIntent';
import { getSafeMasterPostPaymentPath } from './masterPaymentReturn';
import {
  canStartPaidPlanCheckout,
  getPaymentPageMode,
  getSubscriptionDisplaySummary,
  type SubscriptionSummaryData,
} from '../profile/subscriptionSummary';
import { readSessionDetailSource } from '../manage/session-detailTestSource';

const read = (path: string) => readFileSync(path, 'utf8');

function summary(overrides: Partial<SubscriptionSummaryData>): SubscriptionSummaryData {
  return {
    plan: 'free',
    status: 'none',
    periodEnd: null,
    currentPeriodEnd: null,
    nextBillingAt: null,
    cancelAtPeriodEnd: false,
    trialEndsAt: null,
    isAdmin: false,
    canCancelAutoBilling: false,
    ...overrides,
  };
}

describe('MASTER Subscriber Value — VALUE PROMISE SSOT', () => {
  it('keeps Lite complete for teaching management and Premium focused on SPOMOVE', () => {
    const lite = getMasterProductPaymentFeatureLabels(MASTER_PRODUCT_CATALOG.lite).join(' · ');
    const premium = getMasterProductPaymentFeatureLabels(MASTER_PRODUCT_CATALOG.premium).join(' · ');
    expect(getMasterProductPaymentDescription(MASTER_PRODUCT_CATALOG.lite)).toContain('일반 수업관리 흐름을 모두 제공합니다');
    expect(lite).not.toMatch(/프리미엄|SPOMOVE/);
    expect(lite).toContain('수업 안내문');
    expect(getMasterProductPaymentDescription(MASTER_PRODUCT_CATALOG.premium)).toContain('SPOMOVE 디지털 움직임 콘텐츠');
    expect(premium).toContain('Lite의 모든 기능');
    expect(premium).toContain('SPOMOVE');
    expect(getMasterPlanValueWorkflowLines('lite')).toEqual(getMasterProductPaymentFeatureLabels(MASTER_PRODUCT_CATALOG.lite));
  });
});

describe('MASTER Subscriber Value — VALUE-GATE-01 / VALUE-SUB-01 / VALUE-RESUB-01', () => {
  it('VALUE-GATE-01: session_capture aliases continue_record and preserves exact next return', () => {
    expect(normalizeMasterGateIntent('session_capture')).toBe('continue_record');
    const params = new URLSearchParams({
      intent: 'session_capture',
      plan: 'premium',
      next: '/spokedu-master/activity?session=s1&capture=1',
      journeyId: 'capture_s1',
    });
    const context = readMasterGateContextFromSearchParams(params);
    expect(context.mode).toBe('gated');
    expect(context.intent).toBe('continue_record');
    expect(context.allowedPlans).toEqual(['lite', 'premium']);
    expect(context.next).toContain('session=s1');
    expect(context.next).toContain('capture=1');
    const model = buildMasterGateDisplayModel(context);
    expect(model.description).toContain('지난 수업의 맥락을 다음 준비에 이어');
    expect(getSafeMasterPostPaymentPath(context.next, '/spokedu-master/dashboard')).toContain('capture=1');
  });

  it('VALUE-SUB-01: cancel scheduled keeps period access language and value workflow', () => {
    const display = getSubscriptionDisplaySummary(summary({
      plan: 'premium',
      status: 'active',
      cancelAtPeriodEnd: true,
      currentPeriodEnd: '2099-06-30T00:00:00.000Z',
      canCancelAutoBilling: true,
    }));
    expect(display.state).toBe('cancelScheduled');
    expect(display.description).toContain('까지');
    expect(display.description).toContain('자동결제');
    expect(display.valueWorkflow.length).toBeGreaterThan(0);
    expect(getPaymentPageMode(summary({
      plan: 'premium',
      status: 'active',
      cancelAtPeriodEnd: true,
      canCancelAutoBilling: true,
    }))).toBe('blocked');
  });

  it('VALUE-RESUB-01: ended state promises data continuity without empty onboarding language', () => {
    const display = getSubscriptionDisplaySummary(summary({
      plan: 'premium',
      status: 'expired',
      currentPeriodEnd: '2020-01-01T00:00:00.000Z',
    }));
    expect(display.state).toBe('ended');
    expect(display.primaryHref).toBe('/spokedu-master/payment');
    expect(display.description).toContain('데이터는 유지');
    expect(display.description).toContain('다시 구독');
  });
});

describe('MASTER Subscriber Value — VALUE-LITE-01 / VALUE-PREM-01 / VALUE-RET-01', () => {
  it('VALUE-LITE-01: Lite checkout remains full operate loop (not feature-locked as incomplete Premium)', () => {
    const value = summary({ plan: 'lite', status: 'active', canCancelAutoBilling: true, nextBillingAt: '2099-01-01T00:00:00.000Z' });
    expect(getPaymentPageMode(value)).toBe('liteUpgrade');
    expect(canStartPaidPlanCheckout(value, 'lite')).toBe(false);
    expect(canStartPaidPlanCheckout(value, 'premium')).toBe(true);
    const display = getSubscriptionDisplaySummary(value);
    expect(display.description).toBe(getMasterProductPaymentDescription(MASTER_PRODUCT_CATALOG.lite));
    expect(display.valueWorkflow.join(' ')).toContain('출석');
  });

  it('VALUE-RET-01: Manage keeps the current previous-Session reuse surface', () => {
    const activity = readSessionDetailSource();
    expect(activity).toContain('initialTargetDay ?? addSeoulSessionDays');
    expect(activity).not.toContain('NextSessionPlanner');
  });

  it('VALUE-PREM-01 surfaces: Payment keeps gate context while Manage keeps capture deep-link compatibility', () => {
    const payment = read('app/spokedu-master/payment/page.tsx');
    const activity = readSessionDetailSource();
    const manage = read('app/spokedu-master/manage/ManageView.tsx');
    const home = read('app/spokedu-master/dashboard/DashboardView.tsx');
    expect(payment).toContain('buildMasterGateDisplayModel');
    expect(payment).toContain('gateDisplay');
    expect(activity).toContain("legacyCapture ? 'emphasized'");
    expect(activity).toContain('presentation?.captureMode');
    expect(manage).toContain("searchParams.get('capture') === '1'");
    expect(activity).not.toContain('PreviousActivityCarryover');
    expect(activity).not.toContain('Premium modal');
    expect(home).not.toContain('Premium 업그레이드');
    expect(home).not.toContain('프리미엄 배너');
  });

  it('uses concise Korean Premium copy without duplicating the activity noun', () => {
    const context = readMasterGateContextFromSearchParams(new URLSearchParams({
      intent: 'start_spomove',
      plan: 'premium',
      next: '/spokedu-master/spomove/session?preset=simon-basic',
      preset: 'simon-basic',
      journeyId: 'spomove_copy',
    }));
    const model = buildMasterGateDisplayModel(context);
    expect(model.title).not.toContain('활동 활동');
    expect(model.title).toBe('Premium에서 시작할 수 있는 SPOMOVE 활동입니다.');
    expect(model.description).toContain('수업 준비를 바로 이어갈 수 있습니다.');
    expect(model.ctaLabel).toBe('Premium으로 계속하기');
  });
});
