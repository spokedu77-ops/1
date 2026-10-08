import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('LAB authenticated landing session UI', () => {
  const nav = read('app/spokedu-master/landing/components/LandingNavigation.tsx');
  const authControls = read('app/spokedu-master/landing/components/LandingAuthControls.tsx');
  const banner = read('app/spokedu-master/landing/LandingLoggedInBanner.tsx');
  const status = read('app/api/institution/status/route.ts');
  const institutionAccount = read('app/lib/server/institutionAccount.ts');
  const adminLogin = read('app/login/page.tsx');

  it('branches the local header from the real auth session', () => {
    expect(nav).toContain('<LandingAuthControls');
    expect(authControls).toContain("session.status === 'member'");
    expect(authControls).toContain('대시보드');
    expect(authControls).not.toContain('logoutCurrentSession');
    expect(authControls).toContain('무료로 시작하기');
  });

  it('uses LAB branding and never renders the internal institution auth email', () => {
    expect(nav).toContain('<strong>LAB</strong>');
    expect(nav).not.toContain('<strong>MASTER</strong>');
    expect(status).toContain('loginId: row.login_id');
    expect(banner).toContain('{session.displayName} 계정으로 로그인되어 있습니다.');
    expect(banner).not.toContain('SPOKEDU LAB을 계속할 수 있습니다');
    expect(institutionAccount).toContain("INSTITUTION_LAB_DESTINATION = '/spokedu-lab/dashboard'");
  });

  it('offers an explicit account switch instead of looping an existing non-admin session', () => {
    expect(adminLogin).toContain('현재 다른 계정으로 로그인되어 있습니다.');
    expect(adminLogin).toContain('다른 계정으로 로그인');
    expect(adminLogin).toContain("window.location.replace('/login?type=admin&next=%2Fadmin')");
  });
});
