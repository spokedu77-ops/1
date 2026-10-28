import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const shell = readFileSync(join(process.cwd(), 'app/spokedu-master/components/layout/AppShell.tsx'), 'utf8');

describe('AppShell P2-0 access gate contract', () => {
  it('does not restart hard access verification on pathname or query changes', () => {
    expect(shell).not.toMatch(/\[accessRetryKey,\s*currentPathWithQuery,\s*isProtectedRoute/);
    expect(shell).toContain('shouldSkipHardAccessFetch');
    expect(shell).toContain('[accessRetryKey, isProtectedRoute, router]');
  });

  it('keeps route authorization on the existing snapshot while navigating', () => {
    expect(shell).toContain('hasMasterPathAccess(accessGuard.snapshot, pathname, currentPathWithQuery');
    expect(shell).toContain('isMasterAccessShellPending');
  });

  it('guards against stale access responses and identity changes', () => {
    expect(shell).toContain('accessHardFetchRequestIdRef');
    expect(shell).toContain('accessSoftFetchRequestIdRef');
    expect(shell).toContain('isStaleAccessRequest');
    expect(shell).toContain('shouldInvalidateMasterAccessIdentity');
  });

  it('syncs pathname metadata without tying it to access verification', () => {
    expect(shell).toContain('prev.pathname === pathname ? prev : { ...prev, pathname }');
  });
});
