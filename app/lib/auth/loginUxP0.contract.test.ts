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

  it('routes the gate page to MASTER, teacher, and admin login entry points', () => {
    const gate = read('app/page.tsx');

    expect(gate).toContain('SPOKEDU MASTER');
    expect(gate).toContain('강사 운영 앱');
    expect(gate).toContain('/login?next=/spokedu-master/onboarding');
    expect(gate).toContain('/login?type=teacher');
    expect(gate).toContain('/login?type=admin');
    expect(gate).toContain('학부모 · 기관 담당자 전용 서비스는 준비 중입니다.');
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

    expect(landing).toContain("href=\"/login?next=/spokedu-master/dashboard\"");
    expect(landing).not.toContain('href="/spokedu-master/dashboard"');
    expect(landing).toContain('LandingLoggedInBanner');
  });

  it('exposes MASTER login/start CTAs on the marketing site header', () => {
    const chrome = read('app/spokedu/components/site-chrome.tsx');

    expect(chrome).toContain('/login?next=/spokedu-master/dashboard');
    expect(chrome).toContain('/login?next=/spokedu-master/onboarding');
    expect(chrome).toContain('MASTER 시작');
  });

  it('uses tabbed login for MASTER vs ops accounts', () => {
    const login = read('app/login/page.tsx');

    expect(login).toContain("role=\"tablist\"");
    expect(login).toContain('MASTER');
    expect(login).toContain('강사·관리자');
    expect(login).toContain('activeTab');
  });
});
