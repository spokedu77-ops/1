import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

function read(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('SPOKEDU MASTER commercial tier gate contracts', () => {
  it('redacts premium lesson details in the programs API before returning data', () => {
    const source = read('app/api/spokedu-master/programs/route.ts');
    expect(source).toContain('function redactProgramForAccess');
    expect(source).toContain('lessonDetail: undefined');
    expect(source).toContain('visiblePrograms');
    expect(source).toContain('canAccessProProgramDetails(access)');
  });

  it('does not treat an active Lite subscription as PRO in the library UI', () => {
    const source = read('app/spokedu-master/library/LibraryView.tsx');
    expect(source).toContain('useIsPremium');
    expect(source).not.toContain('useIsPro');
    expect(source).toContain('locked={program.isPro && !isPro}');
  });

  it('blocks direct premium lesson detail access for non-premium users', () => {
    const source = read('app/spokedu-master/library/[id]/LibraryDetailView.tsx');
    expect(source).toContain('useIsPremium');
    expect(source).toContain('program.isPro && !isPremium');
    expect(source).toContain('/spokedu-master/payment?plan=premium');
  });

  it('does not fake success for active subscriptions during Lite to Premium billing', () => {
    const source = read('app/api/spokedu-master/payment/billing/issue/route.ts');
    expect(source).not.toContain('replaced: true');
    expect(source).toContain("activePlan !== 'lite' || plan !== 'premium'");
    expect(source).toContain("billingMode = activeSubscription ? 'upgrade' : 'initial'");
  });

  it('requires payment success to match the requested plan and the active access plan', () => {
    const source = read('app/spokedu-master/payment/success/page.tsx');
    expect(source).toContain('json.plan !== plan');
    expect(source).toContain('access.plan === plan');
  });
});
