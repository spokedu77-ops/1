import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getPublicProductContract } from '../lib/publicProductContract';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const canonicalPage = read('app/(spokedu-public)/subscription/page.tsx');
const commercialPage = read('app/spokedu-master/landing/CommercialLanding.tsx');
const legacyPage = read('app/spokedu-master/landing/page.tsx');
const sections = read('app/spokedu-master/landing/components/LandingSections.tsx');
const model = read('app/spokedu-master/landing/models/landingProduct.ts');
const chrome = read('app/spokedu-master/landing/components/LandingChrome.tsx');
const globalFooter = read('app/spokedu/components/site-chrome.tsx');

describe('SPOKEDU MASTER canonical commercial landing', () => {
  it('owns /subscription and permanently redirects the legacy landing', () => {
    expect(canonicalPage).toContain('CommercialLanding');
    expect(canonicalPage).toContain("`${SITE_URL}/subscription`");
    expect(legacyPage).toContain("permanentRedirect('/subscription')");
    expect(commercialPage).toContain('<MasterLocalNav');
    expect(commercialPage).not.toContain('<LandingFooter');
  });

  it('derives plans, comparison and handoffs from the public contract', () => {
    expect(model).toContain('getPublicProductContract()');
    expect(model).toContain('getPublicPlanComparison()');
    expect(model).not.toContain('9900');
    expect(model).not.toContain('28900');
    expect(sections).toContain('product.plans.map');
    expect(sections).toContain('product.comparison.map');
    expect(getPublicProductContract().plans.map((plan) => plan.code)).toEqual(['free', 'lite', 'premium']);
    expect(getPublicProductContract().handoff.freeStartHref).toBe('/spokedu-master/login?next=/spokedu-master/onboarding');
    expect(getPublicProductContract().handoff.loginHref).toBe('/spokedu-master/login?next=/spokedu-master/dashboard');
    expect(getPublicProductContract().handoff.paymentPlanHref('lite')).toBe('/spokedu-master/payment?plan=lite');
    expect(getPublicProductContract().handoff.paymentPlanHref('premium')).toBe('/spokedu-master/payment?plan=premium');
  });

  it('states the current recurring billing and cancellation contract', () => {
    expect(sections).toContain('월 자동결제');
    expect(sections).toContain('최초 결제');
    expect(sections).toContain('해지 예약');
    expect(sections).toContain('결제된 이용 기간 종료일까지');
    expect(sections).toContain('Free로 돌아갑니다');
  });

  it('keeps Free, paid subscriptions, and Center inquiry separate', () => {
    expect(sections).toContain('Free는 기간이 정해진 무료체험이 아닙니다');
    expect(sections).toContain('product.centerInquiry');
    expect(sections).toContain('개인 구독 플랜과 같은 직접 결제 상품이 아닙니다');
    expect(sections).not.toContain('가장 인기');
  });

  it('uses actual product and field assets with no unsupported claims', () => {
    for (const asset of ['home-master-ui.png', 'library-program-cards.png', 'prepare-class-tools.png', 'prepare-lesson-plan.png', 'build-session.png', 'run-session.png', 'run-attendance.png', 'remember-report.png', 'remember-report-detail.png', 'yangcheon-paps.jpg']) {
      expect(sections).toContain(asset);
    }
    expect(sections).not.toMatch(/AI가|자동 추천|회원가|Best seller/);
  });

  it('publishes the required product navigation and legal footer', () => {
    for (const anchor of ['#workflow', '#library', '#spomove', '#plans', '#faq']) expect(chrome).toContain(anchor);
    expect(chrome).toContain('product.handoff.loginHref');
    expect(chrome).toContain('product.handoff.freeStartHref');
    expect(globalFooter).toContain('/spokedu-master/terms');
    expect(globalFooter).toContain('/spokedu-master/privacy');
  });
});
