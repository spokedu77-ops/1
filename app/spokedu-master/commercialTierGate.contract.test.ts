import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  canAccessProgramLessonContent,
  FREE_PREVIEW_PROGRAM_ID,
  WEEKLY_PROGRAM_IDS,
} from './lib/commercialProgramAccess';

function read(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('SPOKEDU MASTER commercial tier gate contracts', () => {
  it('redacts non-preview lesson details in the programs API using library capability, not isPro', () => {
    const source = read('app/api/spokedu-master/programs/route.ts');
    expect(source).toContain('function redactProgramForAccess');
    expect(source).toContain('lessonDetail: undefined');
    expect(source).toContain('steps: []');
    expect(source).toContain('equipment: []');
    expect(source).toContain('visiblePrograms');
    expect(source).toContain('canAccessProgramLessonContent');
    expect(source).not.toContain('access.plan === \'lite\' && !program.isPro');
    expect(source).not.toContain('canAccessProProgramDetails');
  });

  it('locks program lesson content by Free preview ID and Lite library access', () => {
    expect(WEEKLY_PROGRAM_IDS).toEqual(['68', '201', '204', '61']);
    expect(FREE_PREVIEW_PROGRAM_ID).toBe('68');
    expect(canAccessProgramLessonContent({ programId: '68', canUseLibrary: false })).toBe(true);
    expect(canAccessProgramLessonContent({ programId: '201', canUseLibrary: false })).toBe(false);
    expect(canAccessProgramLessonContent({ programId: '201', canUseLibrary: true })).toBe(true);
  });

  it('does not treat isPro as a Premium content lock in the library UI', () => {
    const source = read('app/spokedu-master/library/LibraryView.tsx');
    expect(source).toContain('isProgramLessonLocked');
    expect(source).not.toContain('program.isPro && !isPremium');
    expect(source).not.toContain('locked={program.isPro && !isPremium}');
  });

  it('blocks non-preview lesson detail with a Lite gate', () => {
    const source = read('app/spokedu-master/library/[id]/LibraryDetailView.tsx');
    expect(source).toContain('isProgramLessonLocked');
    expect(source).toContain('buildProgramLessonGateHref');
    expect(source).toContain('Lite로 열기');
    expect(source).not.toContain('program.isPro && !isPremium');
    expect(source).not.toContain('/spokedu-master/payment?plan=premium');
  });

  it('hides locked lesson preview content and routes to Lite payment with intent', () => {
    const previewModal = read('app/spokedu-master/components/lesson/ProgramPreviewModal.tsx');
    const previewContent = read('app/spokedu-master/components/lesson/LessonPreviewContent.tsx');
    const catalogCard = read('app/spokedu-master/components/lesson/LessonCatalogCard.tsx');
    expect(previewModal).toContain('lockHref');
    expect(previewModal).toContain('Lite로 열기');
    expect(previewModal).not.toContain('/spokedu-master/payment?plan=premium');
    expect(previewContent).toContain('locked?: boolean');
    expect(previewContent).toContain('Lite에서 전체 수업 자료를 이용할 수 있습니다');
    expect(previewContent).not.toContain('프리미엄 전용');
    expect(catalogCard).toContain("lockLabel = 'Lite로 열기'");
    expect(catalogCard).not.toContain('프리미엄 자료');
  });

  it('does not fake success for active subscriptions during Lite to Premium billing', () => {
    const source = read('app/api/spokedu-master/payment/billing/issue/route.ts');
    expect(source).not.toContain('replaced: true');
    expect(source).toContain("activePlan !== 'lite' || plan !== 'premium'");
    expect(source).toContain("const billingMode = isUpgrade ? 'upgrade' : 'initial'");
    expect(source).toContain('cancel_at_period_end === true');
    expect(source).toContain('calculateSpokeduMasterLiteUpgradeQuote');
    expect(read('app/api/spokedu-master/payment/webhook/route.ts')).toContain('classifySpokeduMasterBillingMode');
    expect(read('app/api/spokedu-master/payment/webhook/route.ts')).toContain("source: billingMode === 'upgrade' ? 'upgrade' : 'webhook'");
    expect(source).toContain('expectedCustomerKey');
    expect(source).toContain('claimSpokeduMasterBillingOrder');
  });

  it('requires payment success to match the requested plan and the active access plan', () => {
    const source = read('app/spokedu-master/payment/success/page.tsx');
    expect(source).toContain('json.plan !== plan');
    expect(source).toContain('hasMasterEntitlement');
    expect(source).toContain('isPaidAccessActive');
  });
});
