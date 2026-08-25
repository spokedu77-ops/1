import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  MASTER_PRODUCT_CATALOG,
  getMasterProductPaymentDescription,
  getMasterProductPaymentFeatureLabels,
} from './productCatalog';
import { MASTER_ACTION_COPY } from './masterActionGrammar';
import { getMasterRouteRequirement } from '../components/layout/masterRouteAccess';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('MASTER commercial cohesion contracts', () => {
  it('keeps Lite attendance routes separate from Premium records routes', () => {
    expect(getMasterRouteRequirement('/spokedu-master/activity').capability).toBe('attendance');
    expect(getMasterRouteRequirement('/spokedu-master/classes/class-a').capability).toBe('attendance');
    expect(getMasterRouteRequirement('/spokedu-master/students').capability).toBe('attendance');
    expect(getMasterRouteRequirement('/spokedu-master/students/student-a').capability).toBe('records');
    expect(getMasterRouteRequirement('/spokedu-master/report').capability).toBe('records');
    expect(MASTER_PRODUCT_CATALOG.lite.featureEntitlements).toMatchObject({
      canUseAttendance: true,
      canUseRecords: false,
      canUseSpomove: false,
    });
  });

  it('sells outcomes instead of a stale feature count', () => {
    expect(getMasterProductPaymentDescription(MASTER_PRODUCT_CATALOG.lite)).toContain('오늘 수업을 찾고');
    expect(getMasterProductPaymentDescription(MASTER_PRODUCT_CATALOG.premium)).toContain('다음 수업 준비');
    expect(getMasterProductPaymentFeatureLabels(MASTER_PRODUCT_CATALOG.lite).join(' ')).toContain('출석부');
    expect(getMasterProductPaymentFeatureLabels(MASTER_PRODUCT_CATALOG.premium).join(' ')).toContain('SPOMOVE');
  });

  it('uses one destructive vocabulary across Class, Student, and Session', () => {
    expect(MASTER_ACTION_COPY.removeFromClass).toBe('반에서 제외');
    expect(MASTER_ACTION_COPY.archiveStudent).toBe('명단에서 보관');
    expect(MASTER_ACTION_COPY.cancelSession).toBe('수업 취소');
    expect(MASTER_ACTION_COPY.deleteSession).toBe('영구 삭제');
    const students = read('app/spokedu-master/students/page.tsx');
    const classes = read('app/spokedu-master/classes/[classId]/page.tsx');
    const activity = read('app/spokedu-master/activity/page.tsx');
    expect(students).toContain('MASTER_ACTION_COPY.archiveStudent');
    expect(students).not.toContain('Trash2');
    expect(classes).toContain('MASTER_ACTION_COPY.removeFromClass');
    expect(activity).toContain('MASTER_ACTION_COPY.restoreSession');
    expect(activity).toContain('MASTER_ACTION_COPY.replaceSession');
    expect(activity).toContain('MASTER_ACTION_COPY.deleteSession');
  });

  it('keeps operational primary CTAs on the brand token', () => {
    for (const path of [
      'app/spokedu-master/classes/page.tsx',
      'app/spokedu-master/students/page.tsx',
      'app/spokedu-master/activity/page.tsx',
      'app/spokedu-master/dashboard/TodaySessionsPanel.tsx',
    ]) {
      expect(read(path)).toContain('spm-btn-primary');
    }
    expect(read('app/spokedu-master/components/ui/SubscriptionGateWall.tsx')).not.toContain('text-red-600');
  });

  it('aligns operational and library APIs to the same capability names as UI gates', () => {
    expect(read('app/api/spokedu-master/sessions/route.ts')).toContain("requireSpokeduMasterCapability('attendance')");
    expect(read('app/api/spokedu-master/sessions/[sessionId]/attendance/route.ts')).toContain(
      "requireSpokeduMasterCapability('attendance')",
    );
    expect(read('app/api/spokedu-master/program-favorites/route.ts')).toContain(
      "requireSpokeduMasterCapability('library')",
    );
    expect(read('app/api/spokedu-master/programs/route.ts')).toContain(
      "requireSpokeduMasterCapability('library')",
    );
    expect(read('app/api/spokedu-master/explanations/route.ts')).toContain(
      "requireSpokeduMasterCapability('records')",
    );
  });
});
