import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isTossReviewLoginEnabled } from './reviewLogin';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('Toss billing review login', () => {
  it('is disabled unless the public review flag is exactly true', () => {
    expect(isTossReviewLoginEnabled(undefined)).toBe(false);
    expect(isTossReviewLoginEnabled('false')).toBe(false);
    expect(isTossReviewLoginEnabled('TRUE')).toBe(false);
    expect(isTossReviewLoginEnabled('true')).toBe(true);
  });

  it('uses Supabase password auth only inside the gated MASTER login surface', () => {
    const login = read('app/spokedu-master/login/page.tsx');
    const envExample = read('.env.example');

    expect(envExample).toContain('NEXT_PUBLIC_TOSS_REVIEW_LOGIN_ENABLED=false');
    expect(login).toContain('TOSS_REVIEW_LOGIN_ENABLED ? (');
    expect(login).toContain('심사용 ID/PW 로그인');
    expect(login).toContain('auth.signInWithPassword({');
    expect(login).toContain('email: reviewEmail.trim()');
    expect(login).toContain('password: reviewPassword');
    expect(login).toContain('const destination = await resolveMasterDestination(next)');
    expect(login).toContain('const next = getSafeMasterLoginReturnPath');
    expect(login).toContain('MasterEmailOtpForm');
    expect(login).toContain("provider: 'kakao'");
    expect(login).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(login).not.toContain('console.');
  });

  it('publishes the refund anchor and complete cancellation and refund terms', () => {
    const terms = read('app/spokedu-master/terms/page.tsx');

    expect(terms).toContain('id="refund" title="4. 자동결제·해지·환불"');
    expect(terms).toContain('1회 결제당 서비스 제공기간은 1개월');
    expect(terms).toContain('매월 최초 결제일을 기준으로 자동결제가 진행됩니다');
    expect(terms).toContain('현재 결제된 이용기간 종료일까지 서비스를 이용');
    expect(terms).toContain('이후 다음 자동결제는 진행되지 않습니다');
    expect(terms).toContain('결제 후 7일 이내');
    expect(terms).toContain('유료 서비스 또는 유료 콘텐츠를 이용하지 않은 경우 전액 환불');
    expect(terms).toContain('원 결제수단을 통해 환급');
    expect(terms).toContain('해당 법령을 우선 적용');
    expect(terms).toContain('MASTER_SUPPORT_EMAIL');
    expect(terms).toContain('라이트에서 프리미엄으로 즉시 업그레이드');
    expect(terms).toContain('해지를 예약한 상태');
  });
});
