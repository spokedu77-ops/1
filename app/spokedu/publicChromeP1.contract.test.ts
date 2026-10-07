import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('public chrome P1 closure', () => {
  it('keeps Education generic image sizing inside main content', () => {
    const css = read('app/spokedu/components/education-hub.module.css');
    expect(css).toMatch(/\.page main img\s*\{/);
    expect(css).not.toMatch(/\.page img\s*\{/);
  });

  it('does not generate the legacy MASTER landing from runtime consumers', () => {
    const runtimeSources = [
      'app/spokedu-master/profile/page.tsx',
      'app/spokedu-master/login/page.tsx',
      'app/spokedu-master/dashboard/EntitlementPreviewHome.tsx',
      'app/spokedu-master/components/policy/PolicyHeader.tsx',
      'app/lib/auth/logoutSession.ts',
      'app/spokedu-master/components/layout/AppShell.tsx',
    ].map(read);

    for (const source of runtimeSources) {
      expect(source).not.toMatch(/href\s*=\s*["'{`]\/spokedu-lab\/landing/);
      expect(source).not.toMatch(/(?:router\.(?:push|replace)|window\.location\.replace)\(\s*["'`]\/spokedu-lab\/landing/);
      expect(source).not.toMatch(/window\.location\.href\s*=\s*["'`]\/spokedu-lab\/landing/);
    }
    expect(runtimeSources[2]).toContain('`${SPOKEDU_PATHS.subscription}#plans`');
  });
});
