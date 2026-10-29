import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const shell = readFileSync(join(process.cwd(), 'app/spokedu-master/components/layout/AppShell.tsx'), 'utf8');
const provider = readFileSync(join(process.cwd(), 'app/spokedu-master/operational/OperationalDataProvider.tsx'), 'utf8');

describe('AppShell P2-3 operational data host contract', () => {
  it('keeps OperationalDataProvider mounted for attendance users independent of route', () => {
    expect(shell).toContain('canHostOperationalData');
    expect(shell).toContain('syncWhenRouteNeedsData={needsOperationalData}');
    expect(shell).not.toMatch(/\{needsOperationalData \?\s*\(\s*<OperationalDataProvider>/);
  });

  it('does not prefetch operational lists until a route needs operational data', () => {
    expect(provider).toContain('if (!ownerId || !canUseAttendance || !syncWhenRouteNeedsData) return');
    expect(provider).toContain("if (status === 'idle' || status === 'error')");
  });

  it('invalidates operational state when attendance capability is lost', () => {
    expect(provider).toContain('if (!ownerId || !canUseAttendance)');
    expect(provider).toContain('clearData()');
  });
});
