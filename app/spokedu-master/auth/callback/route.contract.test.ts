import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('SPOKEDU MASTER OAuth callback contract', () => {
  it('exchanges the code, then routes from the server access snapshot', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app/spokedu-master/auth/callback/route.ts'), 'utf8');

    expect(source).toContain('exchangeCodeForSession(code)');
    expect(source).toContain('getSpokeduMasterAccessSnapshot()');
    expect(source).toContain('access.snapshot.onboardingDone');
    expect(source).toContain('encodeURIComponent(next)');
    expect(source).not.toContain('profile.row?.onboarding_done');
  });
});
