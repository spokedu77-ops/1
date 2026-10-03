import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getPublicProductContract } from '../lib/publicProductContract';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const page = read('app/spokedu-master/landing/page.tsx');
const sections = read('app/spokedu-master/landing/components/LandingSections.tsx');
const model = read('app/spokedu-master/landing/models/landingProduct.ts');
const chrome = read('app/spokedu-master/landing/components/LandingChrome.tsx');

describe('SPOKEDU MASTER landing public product contract', () => {
  it('derives public plan data and handoffs from the canonical public contract', () => {
    expect(model).toContain('getPublicProductContract()');
    expect(model).not.toContain('9900');
    expect(model).not.toContain('28900');
    expect(page).toContain('getLandingProductModel()');

    const contract = getPublicProductContract();
    expect(contract.plans.map((plan) => plan.code)).toEqual(['free', 'lite', 'premium']);
    expect(contract.centerInquiry.purchasable).toBe(false);
  });

  it('keeps the current recurring billing and cancellation meaning visible', () => {
    expect(sections).toContain('월 자동결제');
    expect(sections).toContain('최초 결제');
    expect(sections).toContain('해지 예약');
    expect(sections).toContain('결제기간 종료일까지');
    expect(sections).toContain('Free로 돌아갑니다');

    expect(sections).not.toContain('신용카드 없이 시작');
    expect(sections).not.toContain('14일 후 자동 만료');
    expect(sections).not.toContain('결제 후 30일 이용');
    expect(sections).not.toContain('가장 인기');
  });

  it('keeps Free, self-serve subscriptions, and Center inquiry semantically separate', () => {
    expect(sections).toContain('Free는 기간이 정해진 무료체험이 아닙니다');
    expect(sections).toContain("product.plans.map");
    expect(sections).toContain('product.centerInquiry');
    expect(sections).toContain('기관 이용은 개별 이용권처럼 직접 결제하지 않습니다');
  });

  it('publishes required business and legal disclosures without duplicating values', () => {
    expect(chrome).toContain('product.business.businessRegistrationNumber');
    expect(chrome).toContain('product.business.mailOrderStatus');
    expect(chrome).toContain('/spokedu-master/terms');
    expect(chrome).toContain('/spokedu-master/privacy');
  });

  it('uses actual product images and avoids unsupported product promises', () => {
    expect(sections).toContain('home-master-ui.png');
    expect(sections).toContain('library-program-cards.png');
    expect(sections).toContain('prepare-class-tools.png');
    expect(sections).toContain('prepare-lesson-plan.png');
    expect(sections).toContain('build-session.png');
    expect(sections).toContain('run-session.png');
    expect(sections).toContain('run-attendance.png');
    expect(sections).toContain('remember-report.png');
    expect(sections).toContain('remember-report-detail.png');
    expect(sections).toContain('yangcheon-paps.jpg');
    expect(sections).not.toContain('home-case-general.webp');
    expect(sections).not.toContain('setup.png');
    expect(sections).toContain('현장에서는 출석과 활동을 한 흐름에서 운영합니다');
    expect(sections).not.toMatch(/AI가|자동으로 최적|자동 추천|개인화 추천/);
    expect(sections.match(/src=\{ASSETS\.lesson\}/g)).toHaveLength(1);
    const productProofKeys = [...sections.matchAll(/src=\{ASSETS\.([A-Za-z]+)\}/g)].map((match) => match[1]);
    expect(new Set(productProofKeys).size).toBe(productProofKeys.length);
  });
});
