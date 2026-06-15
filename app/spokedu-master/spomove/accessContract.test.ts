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
    expect(source).toContain("fetch('/api/spokedu-master/access'");
    expect(source).toContain('OFFICIAL_SPOMOVE_LIBRARY');
  });

  it('does not load drills globally from AppShell', () => {
    const source = read('app/spokedu-master/components/layout/AppShell.tsx');

    expect(source).not.toContain('state.loadDrills');
    expect(source).not.toContain('void loadDrills()');
  });

  it('gates official session rendering on the access endpoint', () => {
    const source = read('app/spokedu-master/spomove/session/page.tsx');
    const gateIndex = source.indexOf("officialAccess !== 'allowed'");
    const engineIndex = source.indexOf('<EngineRouter');

    expect(source).toContain("fetch('/api/spokedu-master/access'");
    expect(gateIndex).toBeGreaterThan(-1);
    expect(engineIndex).toBeGreaterThan(gateIndex);
  });

  it('does not load drills from the official-only session', () => {
    const source = read('app/spokedu-master/spomove/session/page.tsx');

    expect(source).not.toMatch(/\bloadDrills\b|\bdrills\b|\/api\/spokedu-master\/drills/);
  });
});
