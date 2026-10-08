import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('SPOKEDU LAB landing entry P0', () => {
  const publicPage = read('app/(spokedu-public)/spokedu-lab/page.tsx');
  const landingPage = read('app/(spokedu-public)/subscription/page.tsx');
  const publicRoutes = read('app/spokedu/data/public-routes.ts');

  it('checks the existing server access snapshot before rendering the LAB root', () => {
    expect(publicPage).toContain('autoBypassAuthenticatedVisitors');
    expect(landingPage).toContain('getSpokeduMasterAccessSnapshot()');
    expect(landingPage).toContain('getInstitutionAccountByUserId(');
    expect(landingPage).toContain('INSTITUTION_LAB_DESTINATION');
  });

  it('replaces authenticated visitors into the existing onboarding or dashboard routes', () => {
    expect(landingPage).toContain("access.snapshot.onboardingDone");
    expect(landingPage).toContain("'/spokedu-lab/dashboard'");
    expect(landingPage).toContain("'/spokedu-lab/onboarding'");
    expect(landingPage).toContain('redirect(');
  });

  it('keeps an explicit introduction and pricing route for signed-in users', () => {
    expect(publicRoutes).toContain("SPOKEDU_LAB_INTRO_VIEW = 'landing'");
    expect(publicRoutes).toContain('spokeduLabIntroductionHref');
    expect(landingPage).toContain('!introductionView');
    expect(read('app/spokedu-master/profile/page.tsx')).toContain('서비스 소개와 요금제');
    expect(read('app/spokedu-master/dashboard/EntitlementPreviewHome.tsx')).toContain("spokeduLabIntroductionHref('plans')");
  });
});
