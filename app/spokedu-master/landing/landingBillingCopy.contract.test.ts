import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  MASTER_PRODUCT_CATALOG,
  getMasterProductPaymentFeatureLabels,
} from '../lib/productCatalog';

const landing = readFileSync(join(process.cwd(), 'app/spokedu-master/landing/page.tsx'), 'utf8');

describe('SPOKEDU MASTER landing billing copy', () => {
  it('describes the current monthly billing model instead of the removed trial or 30-day purchase model', () => {
    expect(landing).toContain('월 자동결제');
    expect(landing).toContain('언제든 해지 예약');
    expect(landing).toContain('이용 기간 종료일까지 사용');

    expect(landing).not.toContain('신용카드 없이 시작');
    expect(landing).not.toContain('14일 후 자동 만료');
    expect(landing).not.toContain('결제 후 30일 이용');
  });

  it('keeps Landing pricing includes on catalog VALUE PROMISE SSOT', () => {
    expect(landing).toContain('getMasterProductPaymentFeatureLabels(MASTER_PRODUCT_CATALOG.lite)');
    expect(landing).toContain('getMasterProductPaymentFeatureLabels(MASTER_PRODUCT_CATALOG.premium)');

    const lite = getMasterProductPaymentFeatureLabels(MASTER_PRODUCT_CATALOG.lite).join(' ');
    const premium = getMasterProductPaymentFeatureLabels(MASTER_PRODUCT_CATALOG.premium).join(' ');

    expect(lite).toContain('출석');
    expect(lite).not.toContain('안내문 작성·복사');
    expect(lite).not.toContain('SPOMOVE');
    expect(premium).toContain('안내문 작성·복사');
    expect(premium).toContain('SPOMOVE');
  });
});
