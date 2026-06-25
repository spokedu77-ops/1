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
    expect(onboarding).toContain('센터 계정 연결은 준비 중입니다.');
    expect(onboarding).toContain('개인 계정으로 시작');
    expect(onboarding).toContain('onboardingDone: true');
    expect(onboarding).not.toContain('Date.now() + 14 * 24 * 60 * 60 * 1000');
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

  it('keeps the cart and opens a quote inquiry without a completion state', () => {
    const shop = read('app/spokedu-master/shop/page.tsx');

    expect(shop).toContain('href={quoteInquiryHref}');
    expect(shop).toContain('견적 문의 메일 열기');
    expect(shop).toContain('현재 금액은 참고용입니다.');
    expect(shop).not.toContain('createOrderRequest');
    expect(shop).not.toContain('주문 요청 완료');
    expect(shop).not.toContain('접수됩니다');
    expect(shop).not.toContain('<BottomSheet');
    expect(shop).not.toMatch(/href=\{quoteInquiryHref\}[\s\S]{0,300}clearCart/);
  });

  it('keeps the core lesson flow links unchanged', () => {
    const shop = read('app/spokedu-master/shop/page.tsx');

    expect(shop).toContain("href: '/spokedu-master/library'");
    expect(shop).toContain("href: '/spokedu-master/spomove'");
    expect(shop).toContain("href: '/spokedu-master/report'");
  });
});
