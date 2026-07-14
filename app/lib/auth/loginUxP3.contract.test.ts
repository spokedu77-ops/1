import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('SPOKEDU login UX phase 3 contracts', () => {
  it('remembers last used app from product paths', () => {
    const layout = read('app/layout.tsx');
    const postLogin = read('app/lib/auth/postLoginRedirect.ts');

    expect(layout).toContain('rememberLastUsedAppFromPath');
    expect(postLogin).toContain('readLastUsedApp');
    expect(postLogin).toContain('resolveDefaultHomeForLastUsedApp');
  });

  it('reports login UX telemetry through a dedicated auth route', () => {
    const login = read('app/login/page.tsx');
    const route = read('app/api/auth/login-ux/route.ts');

    expect(login).toContain('reportLoginUxEvent');
    expect(route).toContain("context: 'auth.login_ux'");
    expect(route).toContain('auto_redirect_from_login');
  });
});
