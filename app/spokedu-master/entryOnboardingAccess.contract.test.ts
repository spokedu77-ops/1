import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('SPOKEDU MASTER entry, onboarding, and access gate contracts', () => {
  it('routes the app root by onboarding completion without forcing payment', () => {
    const source = read('app/spokedu-master/page.tsx');

    expect(source).toContain('useOptionalMasterAccessContext');
    expect(source).toContain('access?.snapshot.onboardingDone');
    expect(source).toContain("onboardingDone ? '/spokedu-master/dashboard' : '/spokedu-master/onboarding'");
    expect(source).not.toContain('profile?.onboardingDone');
    expect(source).not.toContain('plan=');
  });

  it('keeps onboarding to account setup only', () => {
    const source = read('app/spokedu-master/onboarding/page.tsx');

    expect(source).toContain("router.replace(searchParams.has('next') ? returnPath : '/spokedu-master/dashboard')");
    expect(source).toContain('if (serverOnboardingDone)');
    expect(source).not.toContain('serverOnboardingDone || profile?.onboardingDone');
    expect(source).toContain('MASTER 시작하기');
    expect(source).not.toContain("'/spokedu-master/classes?create=1'");
    expect(source).not.toContain('수업반 등록');
    expect(source).not.toContain('첫 수업 만들기');
    expect(source).toContain('/api/spokedu-master/profile');
    expect(source).not.toContain('trialEndsAt');
    expect(source).not.toContain('무료 체험');
    expect(source).not.toContain('plans=1');
    expect(source).not.toContain('profile?plans');
    expect(source).not.toContain('create-checkout');
    expect(source).not.toContain('plan:');
    expect(source).not.toContain('SPOMAT');
  });

  it('keeps SubscriptionGateWall as a presentation-only gate', () => {
    const source = read('app/spokedu-master/components/ui/SubscriptionGateWall.tsx');

    expect(source).toContain('snapshot: MasterAccessSnapshot');
    expect(source).toContain('requirement: Exclude<MasterCapability');
    expect(source).toContain("'/spokedu-master/subscription'");
    expect(source).toContain("'/spokedu-master/payment'");
    expect(source).not.toContain('MASTER_CENTER_INQUIRY_HREF');
    expect(source).not.toContain('isTrialExpired');
    expect(source).not.toContain('import { canUse');
    expect(source).not.toContain('canUseLibrary(');
    expect(source).not.toContain('canUseClassTools(');
    expect(source).not.toContain('canUseRecords(');
    expect(source).not.toContain('canUseSpomove(');
    expect(source).not.toContain('isPaidMasterPlan');
    expect(source).not.toContain("plan === 'pro'");
    expect(source).not.toContain("plan === 'team'");
  });

  it('keeps AppShell responsible for auth, onboarding, and route gate only', () => {
    const accessRoute = read('app/api/spokedu-master/access/route.ts');
    const shell = read('app/spokedu-master/components/layout/AppShell.tsx');

    expect(accessRoute).toContain('getSpokeduMasterAccessSnapshot');
    expect(accessRoute).not.toContain('requireSpokeduMasterAccess');
    expect(shell).toContain('getMasterRouteRequirement');
    expect(shell).toContain('hasRouteCapability');
    expect(shell).toContain('<SubscriptionGateWall requirement={routeRequirement.capability} snapshot={accessGuard.snapshot} model={gateDisplayModel} />');
    expect(shell).toContain('getSafeMasterReturnPath');
    expect(shell).toContain('buildMasterGateContext');
    expect(shell).toContain('buildMasterGateDisplayModel');
    expect(shell).toContain('accessGuard.snapshot?.onboardingDone');
    expect(shell).toContain('!accessGuard.snapshot.onboardingDone');
    expect(shell).not.toContain('accessGuard.snapshot?.onboardingDone ?? profile?.onboardingDone');
    expect(shell).not.toContain('isTrialExpired');
    expect(shell).not.toContain('MASTER_CENTER_INQUIRY_HREF');
    expect(shell).not.toContain("plan === 'lite'");
    expect(shell).not.toContain("plan === 'premium'");
  });

  it('uses the server access snapshot as the login redirect authority', () => {
    const login = read('app/spokedu-master/login/page.tsx');

    expect(login).toContain("fetch('/api/spokedu-master/access'");
    expect(login).toContain("signOut({ scope: 'local' })");
    expect(login).toContain('clearLoginSessionMarkers()');
    expect(login).not.toContain('.auth.getUser()');
    expect(login).not.toContain("fetch('/api/spokedu-master/profile'");
  });

  it('does not keep duplicate page-level gates for protected feature pages', () => {
    const pages = [
      'app/spokedu-master/library/page.tsx',
      'app/spokedu-master/class-tools/page.tsx',
      'app/spokedu-master/spomove/page.tsx',
      'app/spokedu-master/activity/page.tsx',
      'app/spokedu-master/class-record/page.tsx',
      'app/spokedu-master/students/page.tsx',
      'app/spokedu-master/report/page.tsx',
    ];

    for (const page of pages) {
      expect(read(page)).not.toContain('SubscriptionGateWall');
    }
  });
});
