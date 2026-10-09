import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getPublicProductContract } from '../lib/publicProductContract';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const canonicalPage = read('app/(spokedu-public)/subscription/page.tsx');
const commercialPage = read('app/spokedu-master/landing/CommercialLanding.tsx');
const legacyPage = read('app/spokedu-master/landing/page.tsx');
const sections = read('app/spokedu-master/landing/components/LandingSections.tsx');
const faq = read('app/spokedu-master/landing/landingFaq.ts');
const model = read('app/spokedu-master/landing/models/landingProduct.ts');
const chrome = read('app/spokedu-master/landing/components/LandingChrome.tsx');
const navigation = read('app/spokedu-master/landing/components/LandingNavigation.tsx');
const publicShell = read('app/spokedu/components/spokedu-site-shell.tsx');
const nextConfig = read('next.config.ts');

describe('SPOKEDU LAB canonical commercial landing', () => {
  it('owns /spokedu-lab and permanently redirects the legacy landing', () => {
    expect(canonicalPage).toContain('CommercialLanding');
    expect(canonicalPage).toContain("`${SITE_URL}/spokedu-lab`");
    expect(legacyPage).toContain("permanentRedirect('/spokedu-lab?view=landing')");
    expect(nextConfig).toContain('{ source: "/subscription", destination: "/spokedu-lab", permanent: true }');
    expect(commercialPage).toContain('<MasterLocalNav');
    expect(commercialPage).toContain('<LandingFooter');
    expect(publicShell).toContain("pathname === '/spokedu-lab'");
  });

  it('derives plans, comparison and handoffs from the public contract', () => {
    expect(model).toContain('getPublicProductContract()');
    expect(model).toContain('getPublicPlanComparison()');
    expect(model).not.toContain('9900');
    expect(model).not.toContain('28900');
    expect(sections).toContain('product.plans.map');
    expect(sections).toContain('product.comparison.map');
    expect(getPublicProductContract().plans.map((plan) => plan.code)).toEqual(['free', 'lite', 'premium']);
    expect(getPublicProductContract().handoff.freeStartHref).toBe('/spokedu-lab/login?next=/spokedu-lab/onboarding');
    expect(getPublicProductContract().handoff.loginHref).toBe('/spokedu-lab/login?next=/spokedu-lab/dashboard');
    expect(getPublicProductContract().handoff.paymentPlanHref('lite')).toBe('/spokedu-lab/payment?plan=lite');
    expect(getPublicProductContract().handoff.paymentPlanHref('premium')).toBe('/spokedu-lab/payment?plan=premium');
  });

  it('states the current recurring billing and cancellation contract', () => {
    expect(sections).toContain('월 자동결제');
    expect(sections).toContain('최초 결제');
    expect(sections).toContain('해지 예약');
    expect(sections).toContain('결제된 이용 기간 종료일까지');
    expect(faq).toContain('무료 이용 상태로 돌아가더라도 기존 데이터는 보존됩니다');
  });

  it('keeps Free, paid subscriptions, and Center inquiry separate', () => {
    expect(faq).toContain('무료 이용은 기간이 정해진 체험판이 아닙니다');
    expect(sections).toContain('product.centerInquiry');
    expect(sections).toContain('개인 구독 요금제처럼 직접 결제하는 상품이 아닙니다');
    expect(sections).not.toContain('가장 인기');
  });

  it('uses existing static assets on every rendered landing image path', () => {
    const renderedAssets = [
      '/images/spokedu/home/field-editorial/home-master-ui.png',
      '/images/spokedu/subscription/library-program-cards-20261008-final.png',
      '/images/spokedu/subscription/prepare-lesson-plan-20261008-final.png',
      '/images/spokedu-master/landing/build-session.png',
      '/images/spokedu-master/landing/run-session.png',
      '/images/spokedu-master/landing/run-attendance.png',
      '/images/spokedu/home/field-editorial/home-spomove-field.webp',
      '/images/spokedu/records/yangcheon-paps.jpg',
    ] as const;

    for (const asset of renderedAssets) {
      expect(sections).toContain(asset);
      expect(existsSync(join(process.cwd(), 'public', asset.slice(1))), asset).toBe(true);
    }
    expect(sections).not.toContain('prepare-class-tools.png');
    expect(sections).not.toContain('remember-report.png');
    expect(sections).not.toContain('remember-report-detail.png');
    expect(sections).not.toContain('ASSETS.tools');
    expect(sections).not.toContain('ASSETS.record');
    expect(sections).not.toContain('ASSETS.recordDetail');
    expect(sections).not.toMatch(/AI가|자동 추천|회원가|Best seller/);
  });

  it('keeps the approved four-step workflow and operational landing emphasis', () => {
    const workflowBlock = sections.slice(sections.indexOf('const WORKFLOW'), sections.indexOf('] as const;', sections.indexOf('const WORKFLOW')));
    expect(workflowBlock.match(/\['0[1-4]'/g)).toHaveLength(4);
    expect(workflowBlock).not.toContain("['05'");
    expect(sections).not.toContain('id="records"');
    expect(sections).toContain('현장에서는 출석과 활동을 한 흐름에서 운영합니다.');
    expect(faq).toContain('수업 기록과 학생 관찰, 다음 수업 메모, 수업 안내문 작성 기능');
  });

  it('publishes the required product navigation and legal footer', () => {
    for (const anchor of ['#workflow', '#library', '#spomove', '#plans', '#faq']) expect(navigation).toContain(anchor);
    expect(chrome).toContain('product.handoff.loginHref');
    expect(chrome).toContain('product.handoff.freeStartHref');
    expect(chrome).toContain('id="footer"');
    expect(chrome).toContain('/spokedu-lab/terms');
    expect(chrome).toContain('/spokedu-lab/privacy');
  });
});
