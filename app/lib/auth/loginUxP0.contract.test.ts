import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('SPOKEDU login UX P0 contracts', () => {
  it('redirects existing sessions away from /login', () => {
    const login = read('app/login/page.tsx');
    expect(login).toContain('router.replace(redirectPath)');
    expect(login).toContain('sessionChecked');
    expect(login).toContain('enforceSessionOnlyPolicy');
  });

  it('routes the public root through the SPOKEDU marketing home', () => {
    const root = read('app/(spokedu-public)/page.tsx');
    expect(root).toContain("from '../spokedu/page'");
    expect(root).toContain('revalidate = 86400');
  });

  it('keeps the login persistence checkbox wired to session preference helpers', () => {
    const login = read('app/login/page.tsx');
    expect(login).toContain('이 기기에서 로그인 유지');
    expect(login).toContain('applyLoginSessionPreference(keepLoggedIn)');
    expect(login).toContain('readKeepLoggedInPreference');
    expect(read('app/layout.tsx')).toContain('registerEphemeralBrowserSession');
  });

  it('routes MASTER landing login CTAs through /login with next', () => {
    const landing = read('app/spokedu-master/landing/page.tsx');
    expect(landing).toContain('href="/login?next=/spokedu-master/dashboard"');
    expect(landing).not.toContain('href="/spokedu-master/dashboard"');
    expect(landing).toContain('LandingLoggedInBanner');
  });

  it('keeps MASTER login/start handoffs in the marketing route contract', () => {
    const site = read('app/spokedu/data/site.ts');
    const landing = read('app/spokedu-master/landing/page.tsx');
    expect(site).toContain("dashboardLogin: '/login?next=/spokedu-master/dashboard'");
    expect(site).toContain("onboardingLogin: '/login?next=/spokedu-master/onboarding'");
    expect(landing).toContain('SPOKEDU MASTER 시작하기');
  });

  it('uses tabbed login for MASTER vs ops accounts', () => {
    const login = read('app/login/page.tsx');
    expect(login).toContain('role="tablist"');
    expect(login).toContain('MASTER');
    expect(login).toContain('강사·관리자');
    expect(login).toContain('activeTab');
  });
});
