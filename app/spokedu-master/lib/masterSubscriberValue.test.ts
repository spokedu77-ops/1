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
import { buildNextSessionDraft } from '../activity/nextSession';
import type { MasterSessionDto } from '../types/operational';

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
  it('keeps Lite outcome free of Premium exclusion dumps and Premium as connected memory', () => {
    const lite = getMasterProductPaymentFeatureLabels(MASTER_PRODUCT_CATALOG.lite).join(' · ');
    const premium = getMasterProductPaymentFeatureLabels(MASTER_PRODUCT_CATALOG.premium).join(' · ');
    expect(getMasterProductPaymentDescription(MASTER_PRODUCT_CATALOG.lite)).toContain('현장에서 운영');
    expect(lite).not.toMatch(/프리미엄|SPOMOVE|안내문/);
    expect(getMasterProductPaymentDescription(MASTER_PRODUCT_CATALOG.premium)).toContain('다음 수업 준비');
    expect(premium).toContain('다음 준비');
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
    expect(context.allowedPlans).toEqual(['premium']);
    expect(context.next).toContain('session=s1');
    expect(context.next).toContain('capture=1');
    const model = buildMasterGateDisplayModel(context);
    expect(model.description).toContain('기존 수업 기록은 유지');
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

  it('VALUE-RET-01: next Session draft reuses schedule rhythm (+7 day same clock) as reuse starting point', () => {
    const session: MasterSessionDto = {
      id: 'done-1',
      classId: 'class-a',
      className: 'A반',
      startAt: '2026-08-19T01:00:00.000Z',
      endAt: '2026-08-19T02:00:00.000Z',
      status: 'completed',
      memo: 'keep local',
      completedAt: '2026-08-19T02:00:00.000Z',
      programs: [
        { id: 'p1', sourceType: 'program', programId: 1, spomovePresetId: null, programTitle: '활동1', sortOrder: 0, isCompleted: true },
      ],
      attendance: [{ id: 'a1', studentId: 's1', studentName: '민수', status: 'present' }],
      createdAt: '',
      updatedAt: '',
    };
    const draft = buildNextSessionDraft(session);
    expect(draft.day).toBe('2026-08-26');
    expect(draft.startTime).toBeTruthy();
    expect(draft.endTime).toBeTruthy();
    const activity = read('app/spokedu-master/activity/page.tsx');
    expect(activity).toContain('sourceSessionProgramIds');
    expect(activity).toContain('다음 수업 만들기');
  });

  it('VALUE-PREM-01 surfaces: Payment shows gate context; Completed prioritizes Next over upsell', () => {
    const payment = read('app/spokedu-master/payment/page.tsx');
    const activity = read('app/spokedu-master/activity/page.tsx');
    const home = read('app/spokedu-master/dashboard/DashboardView.tsx');
    expect(payment).toContain('buildMasterGateDisplayModel');
    expect(payment).toContain('gateDisplay');
    expect(activity).toContain('다음 수업 만들기');
    expect(activity).toContain('이번 수업 활동을 다음 일정 준비의 시작점으로');
    expect(activity).not.toContain('Premium modal');
    expect(home).not.toContain('Premium 업그레이드');
    expect(home).not.toContain('프리미엄 배너');
  });
});
