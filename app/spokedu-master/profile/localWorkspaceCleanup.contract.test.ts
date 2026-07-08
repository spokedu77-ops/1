import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(process.cwd(), 'app/spokedu-master/profile/page.tsx'),
  'utf8',
);
const storeSource = readFileSync(
  join(process.cwd(), 'app/spokedu-master/store/index.ts'),
  'utf8',
);
const shellSource = readFileSync(
  join(process.cwd(), 'app/spokedu-master/components/layout/AppShell.tsx'),
  'utf8',
);

describe('profile local workspace cleanup contract', () => {
  it('clears local workspace and profile even when sign out fails', () => {
    const logout = source.slice(
      source.indexOf('const handleLogout'),
      source.indexOf('const handleDeleteMasterData'),
    );
    expect(logout).toContain('await supabase.auth.signOut()');
    expect(logout).toContain('finally');
    expect(logout.indexOf('resetProfile()')).toBeGreaterThan(logout.indexOf('finally'));
    expect(logout.indexOf("router.replace('/spokedu-master/landing')"))
      .toBeGreaterThan(logout.indexOf('resetProfile()'));
  });

  it('clears current owner local data only after server deletion succeeds', () => {
    const deletion = source.slice(
      source.indexOf('const handleDeleteMasterData'),
      source.indexOf('return (', source.indexOf('const handleDeleteMasterData')),
    );
    expect(deletion.indexOf('if (!response.ok)')).toBeGreaterThan(-1);
    expect(deletion.indexOf('clearCurrentOwnerLocalData()'))
      .toBeGreaterThan(deletion.indexOf('if (!response.ok)'));
    expect(deletion).not.toContain('clearCurrentOwnerLocalData();\n    try');
  });
});

describe('local workspace persistence boundary', () => {
  it('persists the workspace owner with store version 15', () => {
    expect(storeSource).toContain('version: 15');
    expect(storeSource).toContain('localWorkspaceOwnerId: state.localWorkspaceOwnerId');
  });

  it('does not block protected routes when subscription sync fails', () => {
    expect(shellSource).not.toMatch(/!subscriptionSynced\s*\|\|/);
    expect(shellSource).toContain('.finally(() => setSubscriptionSynced(true))');
    expect(shellSource).toContain('isAccessGuardPending');
  });
});
