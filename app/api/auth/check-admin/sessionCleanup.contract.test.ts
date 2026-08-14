import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routeSource = readFileSync(new URL('./route.ts', import.meta.url), 'utf8');
const adminLayoutSource = readFileSync(
  new URL('../../../admin/layout.tsx', import.meta.url),
  'utf8',
);
const adminAuthSource = readFileSync(
  new URL('../../../lib/server/adminAuth.ts', import.meta.url),
  'utf8',
);

describe('admin stale session cleanup contract', () => {
  it('clears stale Supabase auth cookies for an invalid refresh token', () => {
    expect(adminAuthSource).toContain("candidate.code === 'refresh_token_not_found'");
    expect(adminAuthSource).toContain("cookie.name.includes('auth-token')");
    expect(adminAuthSource).toContain("maxAge: 0");
  });

  it('forwards cleanup cookies through the always-200 admin check response', () => {
    expect(routeSource).toContain('auth.response.cookies.getAll()');
    expect(routeSource).toContain('response.cookies.set(cookie)');
  });

  it('does not duplicate server auth with a browser getUser call', () => {
    expect(adminLayoutSource).not.toContain('getSupabaseBrowserClient');
    expect(adminLayoutSource).not.toContain('.auth.getUser()');
  });
});
