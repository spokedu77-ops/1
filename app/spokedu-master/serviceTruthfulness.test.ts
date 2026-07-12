import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');

describe('SPOKEDU MASTER service truthfulness contracts', () => {
  it('does not validate or persist arbitrary center identity during onboarding', () => {
    const onboarding = read('app/spokedu-master/onboarding/page.tsx');
    const contracts = read('app/spokedu-master/lib/serviceContracts.ts');

    expect(onboarding).not.toContain('validateCenterCode');
    expect(contracts).not.toContain('validateCenterCode');
    expect(onboarding).not.toContain('centerCode');
    expect(onboarding).toContain('centerId: null');
    expect(onboarding).toContain('centerName: null');
    expect(onboarding).toContain('onboardingDone: true');
    expect(onboarding).toContain('/api/spokedu-master/profile');
    expect(onboarding).not.toContain('Date.now() + 14 * 24 * 60 * 60 * 1000');

    const profilePage = read('app/spokedu-master/profile/page.tsx');
    expect(profilePage).toContain('/api/spokedu-master/profile');
  });

  it('does not present local timestamp changes or deletion as synchronization', () => {
    const operations = read('app/spokedu-master/components/operations/OperationsPanel.tsx');

    expect(operations).not.toContain('setLastSyncNow');
    expect(operations).not.toContain('수동 동기화');
    expect(operations).not.toContain('재시도 완료 처리');
    expect(operations).not.toContain('수업 기록 즉시 반영');
    expect(operations).toContain('최근 로컬 변경');
    expect(operations).toContain('목록에서 지우기');

    const store = read('app/spokedu-master/store/index.ts');
    expect(store).not.toContain('setLastSyncNow');
  });

  it('presents SPOMAT as a single product without a fake order or completion state', () => {
    const shop = read('app/spokedu-master/shop/page.tsx');

    expect(shop).toContain('SPOMAT');
    expect(shop).toContain('SPOMAT_PRODUCT_CONTRACT');
    expect(shop).toContain('useMasterCanBuySpomat');
    expect(shop).toContain('/api/spokedu-master/shop/spomat/purchase');
    expect(shop).toContain('SPOMAT_BULK_INQUIRY_HREF');
    expect(shop).not.toContain('createOrderRequest');
    expect(shop).not.toContain('주문 요청 완료');
    expect(shop).not.toContain('접수됩니다');
    expect(shop).not.toContain('<BottomSheet');
    expect(shop).not.toContain('addToCart');
    expect(shop).not.toContain('clearCart');
  });

  it('keeps the shop focused on SPOMAT without repeating lesson navigation links', () => {
    const shop = read('app/spokedu-master/shop/page.tsx');

    expect(shop).toContain('SPOMAT');
    // lesson flow links belong in the main navigation, not duplicated in the shop
    expect(shop).not.toContain("href: '/spokedu-master/library'");
    expect(shop).not.toContain("href: '/spokedu-master/spomove'");
    expect(shop).not.toContain("href: '/spokedu-master/report'");
  });
});
