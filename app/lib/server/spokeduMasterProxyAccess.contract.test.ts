import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const proxySource = readFileSync(join(process.cwd(), 'proxy.ts'), 'utf8');
const accessSource = readFileSync(join(process.cwd(), 'app/lib/server/spokeduMasterAccess.ts'), 'utf8');

describe('SPOKEDU MASTER proxy/access authority contract', () => {
  it('keeps MASTER entitlement out of proxy and in the server access module', () => {
    expect(proxySource).not.toContain('user.created_at');
    expect(proxySource).not.toContain('isInTrial');
    expect(proxySource).not.toContain('isActiveSubscription');
    expect(proxySource).not.toContain("select('plan,status,period_end')");
    expect(proxySource).not.toContain('SPM_ADMIN_EMAILS');

    expect(accessSource).toContain('evaluateSpokeduMasterEntitlement');
    expect(accessSource).toContain('ensureSpokeduMasterEntitlement');
    expect(accessSource).toContain('isPlatformAdminUser');
  });

  it('allows proxy to do only login routing for protected MASTER paths', () => {
    expect(proxySource).toContain('isSpokeduMasterProtectedPath(pathname)');
    expect(proxySource).toContain("if (!user) return redirectWithNext(request, '/login')");
    expect(proxySource).toContain('MASTER entitlement is intentionally not evaluated in proxy');
  });

  it('keeps the QA auth bypass double-gated by env and cookie', () => {
    expect(proxySource).toContain('canBypassSpokeduMasterAuthForQa');
    expect(proxySource).toContain("process.env.SPOKEDU_MASTER_QA_BYPASS_AUTH === '1'");
    expect(proxySource).toContain("request.cookies.get('spm-qa-auth-bypass')?.value === '1'");
    expect(proxySource).toContain('isSpokeduMasterProtectedPath(pathname) && !canBypassSpokeduMasterAuthForQa(request)');
  });
});
