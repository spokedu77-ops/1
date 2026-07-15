import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const proxySource = readFileSync(join(process.cwd(), 'proxy.ts'), 'utf8');

function extractMatcherBlock(source: string): string {
  const start = source.indexOf('export const config');
  return start >= 0 ? source.slice(start) : source;
}

function extractProxyHandler(source: string): string {
  const start = source.indexOf('export async function proxy');
  const end = source.indexOf('export const config');
  return start >= 0 && end > start ? source.slice(start, end) : source;
}

describe('proxy matcher / CPU contract', () => {
  const matcherBlock = extractMatcherBlock(proxySource);
  const proxyHandler = extractProxyHandler(proxySource);

  it('does not run proxy on /, /login, admin, teacher, class, r, report', () => {
    expect(matcherBlock).not.toMatch(/'\/'/);
    expect(matcherBlock).not.toContain("'/login'");
    expect(matcherBlock).not.toContain("'/admin/:path*'");
    expect(matcherBlock).not.toContain("'/teacher/:path*'");
    expect(matcherBlock).not.toContain("'/class/:path*'");
    expect(matcherBlock).not.toContain("'/r/:path*'");
    expect(matcherBlock).not.toContain("'/report/:path*'");
  });

  it('checks public MASTER paths before creating Supabase client in handler', () => {
    const publicCheck = proxyHandler.indexOf('isSpokeduMasterPublicPath(pathname)');
    const supabaseCreate = proxyHandler.indexOf('createSupabaseProxyClient');
    expect(publicCheck).toBeGreaterThan(-1);
    expect(supabaseCreate).toBeGreaterThan(publicCheck);
  });

  it('does not call getSession in proxy', () => {
    expect(proxySource).not.toContain('getSession');
    expect(proxySource).not.toContain('SESSION_CACHE_TTL_MS');
  });

  it('validates phase tokens before Supabase in handler', () => {
    expect(proxyHandler).toContain('isPhaseTokenPath(pathname)');
    expect(proxyHandler).toContain('validatePhaseToken(request)');
    const phaseCheck = proxyHandler.indexOf('isPhaseTokenPath(pathname)');
    const supabaseCreate = proxyHandler.indexOf('createSupabaseProxyClient');
    expect(phaseCheck).toBeGreaterThan(-1);
    expect(phaseCheck).toBeLessThan(supabaseCreate);
  });
});
