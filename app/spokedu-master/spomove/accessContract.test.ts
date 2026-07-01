import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('SPOMOVE access separation contract', () => {
  it('does not use drills state to gate the official Hub', () => {
    const source = read('app/spokedu-master/spomove/SpomoveHubView.tsx');

    expect(source).not.toMatch(/\bdrillsLoaded\b|\bdrillsError\b/);
    expect(source).not.toContain("fetch('/api/spokedu-master/access'");
    expect(source).toContain('OFFICIAL_SPOMOVE_LIBRARY');
  });

  it('does not load drills globally from AppShell', () => {
    const source = read('app/spokedu-master/components/layout/AppShell.tsx');

    expect(source).not.toContain('state.loadDrills');
    expect(source).not.toContain('void loadDrills()');
  });

  it('gates official session rendering through the common AppShell access boundary', () => {
    const session = read('app/spokedu-master/spomove/session/page.tsx');
    const shell = read('app/spokedu-master/components/layout/AppShell.tsx');

    expect(shell).toContain('pathname.startsWith(`${basePath}/spomove/session`)');
    expect(shell).toContain('isAccessGuardPending');
    expect(shell).toContain('routeGateDenied');
    expect(shell).toContain('isAccessGuardError');
    expect(session).not.toContain("fetch('/api/spokedu-master/access'");
    expect(session).not.toContain('OfficialAccessState');
  });

  it('does not load drills from the official-only session', () => {
    const source = read('app/spokedu-master/spomove/session/page.tsx');

    expect(source).not.toMatch(/\bloadDrills\b|\bdrills\b|\/api\/spokedu-master\/drills/);
  });
});
