import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { MASTER_PRODUCT_CATALOG } from './productCatalog';
import { getMasterRouteRequirement } from '../components/layout/masterRouteAccess';
import { getSessionActionPolicy } from '../activity/sessionActionPolicy';
import { getSafeMasterPostPaymentPath } from './masterPaymentReturn';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('MASTER whole-product maturity journeys', () => {
  it('LITE-01 keeps Class → Session → Attendance operable without records', () => {
    expect(MASTER_PRODUCT_CATALOG.lite.featureEntitlements.canUseAttendance).toBe(true);
    expect(MASTER_PRODUCT_CATALOG.lite.featureEntitlements.canUseRecords).toBe(false);
    expect(getMasterRouteRequirement('/spokedu-master/classes').capability).toBe('attendance');
    expect(getMasterRouteRequirement('/spokedu-master/activity').capability).toBe('attendance');
    expect(getMasterRouteRequirement('/spokedu-master/students').capability).toBe('attendance');
    expect(read('app/api/spokedu-master/sessions/[sessionId]/attendance/route.ts')).toContain(
      "requireSpokeduMasterCapability('attendance')",
    );
  });

  it('PREM-01 connects complete → report → next with session context', () => {
    const activity = read('app/spokedu-master/activity/page.tsx');
    const report = read('app/spokedu-master/report/page.tsx');
    expect(activity).toContain('sourceSessionProgramIds: selectedCarryoverIds');
    expect(report).toContain('backToSessionHref');
    expect(report).toContain('SPM_SECONDARY_BTN');
    expect(getSafeMasterPostPaymentPath('/spokedu-master/report?session=abc')).toContain('session=abc');
  });

  it('CANCEL-01 / CANCEL-02 keep restore and delete aligned with policy + DB', () => {
    expect(getSessionActionPolicy('cancelled')).toMatchObject({ restore: true, deletePermanently: true });
    const restore = read('supabase/migrations/20260826120000_spokedu_master_session_restore.sql');
    expect(restore).toContain("p_status='scheduled'");
    expect(read('app/spokedu-master/lib/masterActionGrammar.ts')).toContain("deleteSession: '수업 삭제'");
  });

  it('GATE-01 preserves student detail and activity session after upgrade', () => {
    expect(getMasterRouteRequirement('/spokedu-master/students/student-a').capability).toBe('records');
    expect(getSafeMasterPostPaymentPath('/spokedu-master/students/stu-1')).toBe('/spokedu-master/students/stu-1');
    expect(getSafeMasterPostPaymentPath('/spokedu-master/activity?session=s1')).toBe(
      '/spokedu-master/activity?session=s1',
    );
  });

  it('LIB-01 assigns into an exact Session without losing the next step', () => {
    const assign = read('app/spokedu-master/components/session/AssignProgramToSessionButton.tsx');
    expect(assign).toContain('activity?session=');
    expect(assign).toContain('SPM_PRIMARY_BTN');
  });
});
