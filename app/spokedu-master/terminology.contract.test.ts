import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const USER_VISIBLE_FILES = [
  'app/spokedu-master/dashboard/DashboardView.tsx',
  'app/spokedu-master/library/LibraryView.tsx',
  'app/spokedu-master/library/[id]/LibraryDetailView.tsx',
  'app/spokedu-master/class-record/page.tsx',
  'app/spokedu-master/report/page.tsx',
  'app/spokedu-master/spomove/page.tsx',
  'app/spokedu-master/spomove/session/page.tsx',
  'app/spokedu-master/components/layout/StatusBar.tsx',
  'app/spokedu-master/components/layout/TabBar.tsx',
  'app/spokedu-master/landing/page.tsx',
  'app/spokedu-master/payment/page.tsx',
  'app/spokedu-master/profile/page.tsx',
  'app/spokedu-master/terms/page.tsx',
  'app/spokedu-master/privacy/page.tsx',
  'app/spokedu-master/subscription/page.tsx',
  'app/spokedu-master/students/page.tsx',
] as const;

const userVisibleSource = () => USER_VISIBLE_FILES.map(read).join('\n');

describe('SPOKEDU MASTER user-facing terminology and product truth', () => {
  it('uses the fixed representative terms on user-facing screens', () => {
    const source = userVisibleSource();

    expect(source).toContain('라이브러리');
    expect(source).toContain('수업 미리보기');
    expect(source).toContain('전체 수업 자료 보기');
    expect(source).toContain('수업 기록');
    expect(source).toContain('안내문');
    expect(source).toContain('즐겨찾기');
    expect(source).toContain('내 활동·기록');
  });

  it('does not expose deprecated representative terms in the checked files', () => {
    const source = userVisibleSource();

    expect(source).not.toContain('맞춤 추천');
    expect(source).not.toContain('AI 추천');
    expect(source).not.toContain('성장 분석');
    expect(source).not.toContain('진행 중');
  });

  it('presents Lite and Premium as the only direct purchase products from the catalog', () => {
    const payment = read('app/spokedu-master/payment/page.tsx');
    const profile = read('app/spokedu-master/profile/page.tsx');
    const subscription = read('app/spokedu-master/subscription/page.tsx');
    const catalog = read('app/spokedu-master/lib/productCatalog.ts');
    const checkout = read('app/api/spokedu-master/payment/create-checkout/route.ts');

    expect(catalog).toContain('MASTER_LITE_PRICE_KRW = 9900');
    expect(catalog).toContain('MASTER_PREMIUM_PRICE_KRW = 28900');
    expect(catalog).toContain("serverPlanKey: 'lite'");
    expect(catalog).toContain("serverPlanKey: 'premium'");
    expect(payment).toContain('getDirectPurchaseMasterProducts');
    expect(subscription).toContain('getDirectPurchaseMasterProducts');
    expect(profile).toContain('MASTER_PRODUCT_CATALOG.premium');
    expect(payment).not.toContain("(['pro'] as PlanKey[])");
    expect(checkout).toContain('월 자동결제 등록 API를 사용해 주세요.');
  });

  it('does not present unavailable parent sharing or automated delivery as provided features', () => {
    const source = [
      read('app/spokedu-master/landing/page.tsx'),
      read('app/spokedu-master/payment/page.tsx'),
      read('app/spokedu-master/profile/page.tsx'),
      read('app/spokedu-master/terms/page.tsx'),
      read('app/spokedu-master/privacy/page.tsx'),
      read('app/spokedu-master/lib/productCatalog.ts'),
    ].join('\n');

    expect(source).toContain('안내문 작성·저장·복사');
    expect(source).not.toContain('보호자용 공개 링크 제공');
    expect(source).not.toContain('카카오톡 자동 발송 제공');
    expect(source).not.toContain('문자 자동 발송 제공');
  });

  it('keeps support contact unified', () => {
    const source = userVisibleSource();

    expect(source).not.toContain('support@spokedu.com');
    expect(source).not.toContain('help@spokedu.com');
    expect(source).not.toContain('contact@spokedu.com');
    expect(source).not.toContain('스포케듀');
    // Contact is supplied via the MASTER_BUSINESS_INFO constants (verified in businessInfo.contract.test.ts)
    const usesApprovedContact =
      source.includes('spokedu77@gmail.com') ||
      source.includes('MASTER_SUPPORT_EMAIL') ||
      source.includes('MASTER_BUSINESS_INFO') ||
      source.includes('MASTER_CUSTOMER_SERVICE_HREF') ||
      source.includes('MASTER_CENTER_INQUIRY_HREF');
    expect(usesApprovedContact).toBe(true);
  });
});
