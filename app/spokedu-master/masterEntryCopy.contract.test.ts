import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('SPOKEDU MASTER entry copy alignment', () => {
  it('keeps login OTP copy aligned with no-trial billing policy', () => {
    const login = read('app/login/page.tsx');
    const otpForm = read('app/components/auth/MasterEmailOtpForm.tsx');

    expect(otpForm).toContain('이메일로 시작하기');
    expect(otpForm).toContain('구독 선택 후 사용할 수 있습니다');
    expect(login).toContain('이메일 인증으로 시작하기');
    expect(login).toContain('비밀번호로 로그인');
    expect(login).toContain('MasterEmailOtpForm');

    expect(login).not.toContain('14일');
    expect(login).not.toContain('무료 체험');
    expect(login).not.toContain('SPOKEDU MASTER Trial');
    expect(otpForm).not.toContain('14일');
    expect(otpForm).not.toContain('무료 체험');
  });

  it('keeps spokedu curriculum marketing aligned with MASTER billing policy', () => {
    const curriculum = read('app/spokedu/data/curriculum-page.ts');
    const publicContract = read('app/spokedu-master/lib/publicProductContract.ts');

    expect(curriculum).toContain('getPublicProductContract');
    expect(curriculum).toContain('연간 결제');
    expect(curriculum).toContain('현재 판매하지 않음');
    expect(curriculum).toContain('무료로 시작하기');
    expect(publicContract).toContain('annualSold: false');
    expect(publicContract).toContain("billingCycle: 'monthly'");
    expect(read('app/spokedu-master/lib/productCatalog.ts')).toContain('월 자동결제');

    expect(curriculum).not.toContain('7일 무료 체험');
    expect(curriculum).not.toContain('14일');
    expect(curriculum).not.toContain('무료 체험');
    expect(curriculum).not.toContain('오픈 예정');
    expect(curriculum).not.toMatch(/from ['"].*productCatalog['"]/);
  });

  it('keeps the parent route as a blocked public link sink, not a browse feature', () => {
    const parent = read('app/spokedu-master/parent/[studentId]/page.tsx');
    const routeAccess = read('app/spokedu-master/components/layout/masterRouteAccess.ts');
    const proxy = read('proxy.ts');

    expect(parent).toContain('보호자 공개 링크는 현재 제공하지 않습니다.');
    expect(parent).not.toContain('useMasterStore');
    expect(routeAccess).toContain('`${basePath}/parent`');
    expect(proxy).toContain("'/spokedu-master/parent'");
  });
});
